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
const H = 132;
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
      <Path d="M24,129 L24,117 M24,129 L36,129" stroke={gold} strokeWidth={1.5} fill="none" />
      <Path d="M656,129 L644,129 M656,129 L656,117" stroke={gold} strokeWidth={1.5} fill="none" />

      {/* Top double rule */}
      <Line x1={40} y1={17} x2={640} y2={17} stroke={gold} strokeWidth={1.2} />
      <Line x1={40} y1={21} x2={640} y2={21} stroke={gold} strokeWidth={0.5} />

      {/* MAIN STREET */}
      <SvgText x={340} y={49} textAnchor="middle" fill={gold} fontFamily={SERIF} fontSize={22} letterSpacing={7}>
        MAIN STREET
      </SvgText>

      {/* Ornament row: lines + three diamonds */}
      <Line x1={50} y1={61} x2={265} y2={61} stroke={gold} strokeWidth={0.5} />
      <Polygon points="280,56 284,61 280,66 276,61" fill={gold} />
      <Polygon points="340,54 347,61 340,68 333,61" fill={gold} />
      <Polygon points="400,56 404,61 400,66 396,61" fill={gold} />
      <Line x1={415} y1={61} x2={630} y2={61} stroke={gold} strokeWidth={0.5} />

      {/* GAZETTE */}
      <SvgText x={340} y={109} textAnchor="middle" fill={headline} fontFamily={SERIF} fontSize={54} fontWeight="700" letterSpacing={5}>
        GAZETTE
      </SvgText>

      {/* Bottom double rule */}
      <Line x1={40} y1={120} x2={640} y2={120} stroke={gold} strokeWidth={0.5} />
      <Line x1={40} y1={124} x2={640} y2={124} stroke={gold} strokeWidth={1.2} />

    </Svg>
  );
}
