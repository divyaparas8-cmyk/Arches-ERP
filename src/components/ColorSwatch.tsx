interface ColorSwatchProps {
  hex: string;
  name: string;
  size?: number;
}

export default function ColorSwatch({ hex, name, size = 16 }: ColorSwatchProps) {
  return (
    <div
      className="rounded-full border border-black/10 shrink-0"
      style={{ width: size, height: size, backgroundColor: hex }}
      title={name}
    />
  );
}
