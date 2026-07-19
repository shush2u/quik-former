import { useEffect, useRef, useState } from "react";

interface SignatureInputProps {
  value: string;
  onChange(value: string): void;
}

export function SignatureInput({ value, onChange }: SignatureInputProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0);
      image.src = value;
    }
  }, [value]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / Math.max(rect.height, 1)) * event.currentTarget.height,
    };
  };

  return (
    <div className="signature-control">
      <canvas
        ref={canvas}
        width="640"
        height="180"
        aria-label="Draw signature"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const context = event.currentTarget.getContext("2d");
          const position = point(event);
          context?.beginPath();
          context?.moveTo(position.x, position.y);
          setDrawing(true);
        }}
        onPointerMove={(event) => {
          if (!drawing) return;
          const context = event.currentTarget.getContext("2d");
          const position = point(event);
          if (context) {
            context.lineWidth = 3;
            context.lineCap = "round";
            context.strokeStyle = "#172033";
            context.lineTo(position.x, position.y);
            context.stroke();
          }
        }}
        onPointerUp={(event) => {
          setDrawing(false);
          try {
            onChange(event.currentTarget.toDataURL("image/png"));
          } catch {
            onChange("signature-drawn");
          }
        }}
      />
      <button type="button" className="secondary-button" onClick={() => onChange("")}>
        Clear signature
      </button>
    </div>
  );
}
