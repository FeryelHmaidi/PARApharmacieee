import React from 'react';
interface SelectCardProps {
  title: string;
  subtitle?: string;
  active: boolean;
  setSelect: (value: string) => void;
}
const SelectCard = ({
  title,
  subtitle,
  active,
  setSelect
}: SelectCardProps) => {
  return (
    <div
      onClick={() => {
        setSelect(title.toLocaleLowerCase());
      }}
      className={`flex flex-col border flex-1 h-fit px-4 py-3 rounded-lg cursor-pointer gap-1 ${active ? 'border-primary' : 'border-gray-200'}`}
    >
      <div className={`text-lg ${active && 'text-blue-500'}`}>{title}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
};
export default SelectCard;
