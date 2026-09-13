import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  createUser,
  getUser,
  setBiometricReady,
  verifyPassword,
  updateProfile,
} from '@/db/repositories/user';
import { getBooleanSetting, setBooleanSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import type { AppUser } from '@/lib/types';

const SESSAO = 'watson_sessao_ativa';

export interface BiometriaInfo {
  disponivel: boolean;
  cadastrada: boolean;
  tipo: 'facial' | 'digital' | 'iris' | 'nenhum';
}

interface AuthState {
  carregando: boolean;
  usuario: AppUser | null;
  autenticado: boolean;
  biometria: BiometriaInfo;
  biometriaAtiva: boolean;
  cadastrar: (dados: { name: string; email?: string; password: string }) => Promise<void>;
  entrarComSenha: (senha: string) => Promise<boolean>;
  entrarComBiometria: () => Promise<boolean>;
  ativarBiometria: (ativar: boolean) => Promise<boolean>;
  sair: () => Promise<void>;
  atualizarPerfil: (nome: string, email: string | null) => Promise<void>;
  recarregar: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function detectarBiometria(): Promise<BiometriaInfo> {
  try {
    const [disponivel, cadastrada, tipos] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    let tipo: BiometriaInfo['tipo'] = 'nenhum';
    if (tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) tipo = 'facial';
    else if (tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) tipo = 'digital';
    else if (tipos.includes(LocalAuthentication.AuthenticationType.IRIS)) tipo = 'iris';

    return { disponivel, cadastrada, tipo };
  } catch {
    return { disponivel: false, cadastrada: false, tipo: 'nenhum' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<AppUser | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [biometria, setBiometria] = useState<BiometriaInfo>({
    disponivel: false,
    cadastrada: false,
    tipo: 'nenhum',
  });

  const carregar = useCallback(async () => {
    const [u, info, ativa] = await Promise.all([
      getUser(),
      detectarBiometria(),
      getBooleanSetting(SETTINGS_KEYS.biometriaAtiva, false),
    ]);
    setUsuario(u);
    setBiometria(info);
    setBiometriaAtiva(ativa);

    if (u) {
      const sessao = await SecureStore.getItemAsync(SESSAO).catch(() => null);
      // A sessao fica salva no aparelho: uma vez cadastrado, o Watson abre
      // direto. Se a biometria estiver ligada, ela vira a tranca da porta.
      setAutenticado(sessao === '1' && !ativa);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const cadastrar = useCallback<AuthState['cadastrar']>(async (dados) => {
    const novo = await createUser(dados);
    await SecureStore.setItemAsync(SESSAO, '1');
    setUsuario(novo);
    setAutenticado(true);
  }, []);

  const entrarComSenha = useCallback<AuthState['entrarComSenha']>(async (senha) => {
    const ok = await verifyPassword(senha);
    if (ok) {
      await SecureStore.setItemAsync(SESSAO, '1');
      setAutenticado(true);
    }
    return ok;
  }, []);

  const entrarComBiometria = useCallback<AuthState['entrarComBiometria']>(async () => {
    const info = await detectarBiometria();
    if (!info.disponivel || !info.cadastrada) return false;

    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear o Watson',
      cancelLabel: 'Usar senha',
      disableDeviceFallback: false,
    });

    if (resultado.success) {
      await SecureStore.setItemAsync(SESSAO, '1');
      setAutenticado(true);
      return true;
    }
    return false;
  }, []);

  const ativarBiometria = useCallback<AuthState['ativarBiometria']>(async (ativar) => {
    if (ativar) {
      const info = await detectarBiometria();
      if (!info.disponivel || !info.cadastrada) return false;
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmar para ligar o desbloqueio biometrico',
      });
      if (!resultado.success) return false;
    }
    await setBooleanSetting(SETTINGS_KEYS.biometriaAtiva, ativar);
    await setBiometricReady(ativar);
    setBiometriaAtiva(ativar);
    return true;
  }, []);

  const sair = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSAO).catch(() => undefined);
    setAutenticado(false);
  }, []);

  const atualizarPerfil = useCallback<AuthState['atualizarPerfil']>(async (nome, email) => {
    await updateProfile(nome, email);
    setUsuario(await getUser());
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      carregando,
      usuario,
      autenticado,
      biometria,
      biometriaAtiva,
      cadastrar,
      entrarComSenha,
      entrarComBiometria,
      ativarBiometria,
      sair,
      atualizarPerfil,
      recarregar: carregar,
    }),
    [
      carregando,
      usuario,
      autenticado,
      biometria,
      biometriaAtiva,
      cadastrar,
      entrarComSenha,
      entrarComBiometria,
      ativarBiometria,
      sair,
      atualizarPerfil,
      carregar,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return ctx;
}
