import React from "react";
import Svg, { Line, Path, Polygon, Text as SvgText } from "react-native-svg";
import { useTheme } from "react-native-paper";

interface Props {
  width: number;
  height: number;
  accessible?: boolean;
  accessibilityElementsHidden?: boolean;
}

const W = 680;
const H = 148;
const SERIF = "Georgia, serif";

export function MsgHeaderBanner({ width, height, accessible = false, accessibilityElementsHidden }: Props) {
  const theme = useTheme();
  const gold = theme.colors.primary;
  const headline = theme.colors.onSurface;

  return (
    <Svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={height}
      accessible={accessible}
      accessibilityElementsHidden={accessibilityElementsHidden}
    >
      {/* Corner brackets */}
      <Path d="M24,8 L24,20 M24,8 L36,8" stroke={gold} strokeWidth={1.5} fill="none" />
      <Path d="M656,8 L644,8 M656,8 L656,20" stroke={gold} strokeWidth={1.5} fill="none" />
      <Path d="M24,140 L24,128 M24,140 L36,140" stroke={gold} strokeWidth={1.5} fill="none" />
      <Path d="M656,140 L644,140 M656,140 L656,128" stroke={gold} strokeWidth={1.5} fill="none" />

      {/* Top double rule */}
      <Line x1={40} y1={17} x2={640} y2={17} stroke={gold} strokeWidth={1.2} />
      <Line x1={40} y1={21} x2={640} y2={21} stroke={gold} strokeWidth={0.5} />

      {/* MAIN STREET */}
      <SvgText x={340} y={45} textAnchor="middle" fill={gold} fontFamily={SERIF} fontSize={12} letterSpacing={8}>
        MAIN STREET
      </SvgText>

      {/* Ornament row: lines + three diamonds */}
      <Line x1={50} y1={59} x2={300} y2={59} stroke={gold} strokeWidth={0.5} />
      <Polygon points="315,54 319,59 315,64 311,59" fill={gold} />
      <Polygon points="340,52 347,59 340,66 333,59" fill={gold} />
      <Polygon points="365,54 369,59 365,64 361,59" fill={gold} />
      <Line x1={380} y1={59} x2={630} y2={59} stroke={gold} strokeWidth={0.5} />

      {/* GAZETTE */}
      <SvgText x={340} y={109} textAnchor="middle" fill={headline} fontFamily={SERIF} fontSize={54} fontWeight="700" letterSpacing={5}>
        GAZETTE
      </SvgText>

      {/* Bottom double rule */}
      <Line x1={40} y1={120} x2={640} y2={120} stroke={gold} strokeWidth={0.5} />
      <Line x1={40} y1={124} x2={640} y2={124} stroke={gold} strokeWidth={1.2} />

      {/* Tagline */}
      <SvgText x={340} y={137} textAnchor="middle" fill={gold} fontFamily={SERIF} fontSize={8} letterSpacing={3}>
        {"EST. 2025 · THEME PARK NEWS & BEYOND"}
      </SvgText>
    </Svg>
  );
}
