import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, radius, spacing, type } from '@/theme';

export interface PontoSerie {
  rotulo: string;
  valor: number | null;
}

function caminho(pontos: { x: number; y: number }[]): string {
  if (!pontos.length) return '';
  return pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/**
 * Uma serie, um grafico. Sem legenda, porque o titulo ja nomeia a serie, e
 * sem numero em cada ponto: o valor atual vive no topo do cartao e o resto
 * da linha existe para mostrar a forma da tendencia.
 */
export function Sparkline({
  dados,
  cor = colors.brass,
  altura = 64,
  mostrarUltimoPonto = true,
  onSelecionar,
}: {
  dados: PontoSerie[];
  cor?: string;
  altura?: number;
  mostrarUltimoPonto?: boolean;
  onSelecionar?: (ponto: PontoSerie | null) => void;
}) {
  const [largura, setLargura] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const validos = dados.filter((d) => d.valor !== null) as { rotulo: string; valor: number }[];

  const geometria = useMemo(() => {
    if (largura <= 0 || validos.length < 2) return null;
    const pad = 6;
    const min = Math.min(...validos.map((d) => d.valor));
    const max = Math.max(...validos.map((d) => d.valor));
    const span = max - min || 1;
    const passo = (largura - pad * 2) / (validos.length - 1);

    const pontos = validos.map((d, i) => ({
      x: pad + i * passo,
      y: pad + (1 - (d.valor - min) / span) * (altura - pad * 2),
      dado: d,
    }));

    return {
      pontos,
      linha: caminho(pontos),
      area: `${caminho(pontos)} L${pontos[pontos.length - 1].x.toFixed(2)},${altura} L${pontos[0].x.toFixed(2)},${altura} Z`,
    };
  }, [largura, validos, altura]);

  const aoTocar = (evento: { nativeEvent: { locationX: number } }) => {
    if (!geometria) return;
    const x = evento.nativeEvent.locationX;
    let maisProximo = 0;
    let menorDistancia = Infinity;
    geometria.pontos.forEach((p, i) => {
      const distancia = Math.abs(p.x - x);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisProximo = i;
      }
    });
    setSelecionado(maisProximo);
    onSelecionar?.(geometria.pontos[maisProximo].dado);
  };

  const idGradiente = `grad-${cor.replace('#', '')}`;

  return (
    <View
      style={{ height: altura }}
      onLayout={(e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => !!onSelecionar}
      onResponderGrant={aoTocar}
      onResponderMove={aoTocar}
      onResponderRelease={() => {
        setSelecionado(null);
        onSelecionar?.(null);
      }}
    >
      {geometria && largura > 0 && (
        <Svg width={largura} height={altura}>
          <Defs>
            <LinearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={cor} stopOpacity="0.22" />
              <Stop offset="1" stopColor={cor} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={geometria.area} fill={`url(#${idGradiente})`} />
          <Path
            d={geometria.linha}
            stroke={cor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {mostrarUltimoPonto && (
            <Circle
              cx={geometria.pontos[geometria.pontos.length - 1].x}
              cy={geometria.pontos[geometria.pontos.length - 1].y}
              r={3.5}
              fill={cor}
              stroke={colors.surface}
              strokeWidth={2}
            />
          )}
          {selecionado !== null && (
            <>
              <Line
                x1={geometria.pontos[selecionado].x}
                y1={0}
                x2={geometria.pontos[selecionado].x}
                y2={altura}
                stroke={colors.borderStrong}
                strokeWidth={1}
              />
              <Circle
                cx={geometria.pontos[selecionado].x}
                cy={geometria.pontos[selecionado].y}
                r={4.5}
                fill={cor}
                stroke={colors.surface}
                strokeWidth={2}
              />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

/**
 * Barras diarias com extremidade arredondada e folga entre as barras, para
 * que duas colunas vizinhas nunca se colem visualmente.
 */
export function BarrasDiarias({
  dados,
  cor = colors.brass,
  altura = 88,
  maximo,
  sufixo = '',
}: {
  dados: PontoSerie[];
  cor?: string;
  altura?: number;
  maximo?: number;
  sufixo?: string;
}) {
  const [largura, setLargura] = useState(0);
  const validos = dados.map((d) => d.valor).filter((v): v is number => v !== null);
  const teto = maximo ?? (validos.length ? Math.max(...validos) * 1.15 : 1);

  const alturaGrafico = altura - 18;
  const vaoBarra = largura > 0 ? largura / dados.length : 0;
  const larguraBarra = Math.max(4, vaoBarra - 6);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 && (
        <Svg width={largura} height={alturaGrafico}>
          {dados.map((d, i) => {
            const valor = d.valor ?? 0;
            const h = teto > 0 ? Math.max(valor > 0 ? 3 : 0, (valor / teto) * alturaGrafico) : 0;
            return (
              <Rect
                key={`${d.rotulo}-${i}`}
                x={i * vaoBarra + (vaoBarra - larguraBarra) / 2}
                y={alturaGrafico - h}
                width={larguraBarra}
                height={h}
                rx={Math.min(4, larguraBarra / 2)}
                fill={d.valor === null ? colors.border : cor}
                opacity={d.valor === null ? 0.5 : 1}
              />
            );
          })}
        </Svg>
      )}
      <View style={c.eixo}>
        {dados.map((d, i) => (
          <Text key={`r-${d.rotulo}-${i}`} style={[c.eixoTexto, { width: vaoBarra }]} numberOfLines={1}>
            {d.rotulo}
          </Text>
        ))}
      </View>
      {!!sufixo && <Text style={c.sufixo}>{sufixo}</Text>}
    </View>
  );
}

/** Medidor circular para um percentual unico, com o numero no centro. */
export function Medidor({
  valor,
  cor,
  tamanho = 92,
  espessura = 7,
  rotulo,
}: {
  valor: number | null;
  cor: string;
  tamanho?: number;
  espessura?: number;
  rotulo?: string;
}) {
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const proporcao = valor === null ? 0 : Math.max(0, Math.min(100, valor)) / 100;

  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tamanho} height={tamanho} style={StyleSheet.absoluteFill}>
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={colors.border}
          strokeWidth={espessura}
          fill="none"
        />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circunferencia * proporcao} ${circunferencia}`}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>
      <Text style={[c.medidorValor, { color: valor === null ? colors.textMuted : colors.text }]}>
        {valor === null ? '--' : Math.round(valor)}
      </Text>
      {!!rotulo && <Text style={c.medidorRotulo}>{rotulo}</Text>}
    </View>
  );
}

const c = StyleSheet.create({
  eixo: { flexDirection: 'row', marginTop: spacing.sm },
  eixoTexto: { ...type.caption, fontSize: 9.5, color: colors.textMuted, textAlign: 'center' },
  sufixo: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  medidorValor: { ...type.numeral, fontSize: 26, lineHeight: 30 },
  medidorRotulo: { ...type.caption, fontSize: 9.5, color: colors.textMuted, marginTop: 1 },
});

export const chartRadius = radius;
