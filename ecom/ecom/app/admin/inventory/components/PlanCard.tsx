import React from 'react';

interface PlanCardProps {
  title: string;
  price: number;
  duration_type: string;
  duration: number;
  active: boolean;
  setSelect: () => void; // Update type to match the new store
}

const PlanCard = ({
  title,
  price,
  duration_type,
  duration,
  active,
  setSelect
}: PlanCardProps) => {
  return (
    <div
      onClick={setSelect} // No need to process title here
      className={`flex items-center justify-between border flex-1 h-fit px-4 py-5 rounded-lg cursor-pointer gap-1 ${
        active ? 'border-primary ' : 'border-gray-200'
      }`}
    >
      <div className={`text-lg ${active && 'text-blue-500'}`}>{title}</div>
      <div className="flex">
        <p className={`text-2xl font-normal ${active && 'text-blue-500'}`}>
          {price} TND
        </p>
        <p className={`text-sm font-semibold ${active && 'text-blue-500'}`}>
          /{duration === 1 ? duration_type : `${duration} ${duration_type}s`}
        </p>
      </div>
    </div>
  );
};

export default PlanCard;
