interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function OpacitySlider({ value, onChange }: Props) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-xs tracking-[0.02em] font-medium text-gray-500">Opacità</h3>
      </div>
      <label className="grid gap-2 text-sm">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-emerald-800"
        />
      </label>
    </div>
  );
}
