import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { SummaryCards } from './SummaryCards';

interface SummaryCardData {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  condition?: boolean;
}

interface HeaderButton {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-white';
  className?: string;
}

interface FinancePageHeaderProps {
  title: string;
  subtitle: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  darkGradientFrom: string;
  darkGradientVia: string;
  darkGradientTo: string;
  subtitleColor: string;
  darkSubtitleColor: string;
  summaryCards: SummaryCardData[];
  buttons: HeaderButton[];
}

export const FinancePageHeader: React.FC<FinancePageHeaderProps> = ({
  title,
  subtitle,
  gradientFrom,
  gradientVia,
  gradientTo,
  darkGradientFrom,
  darkGradientVia,
  darkGradientTo,
  subtitleColor,
  darkSubtitleColor,
  summaryCards,
  buttons
}) => {
  return (
    <div
      className={`bg-gradient-to-br from-${gradientFrom} via-${gradientVia} to-${gradientTo} dark:from-${darkGradientFrom} dark:via-${darkGradientVia} dark:to-${darkGradientTo} rounded-2xl p-6 text-white shadow-lg`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="mb-4 lg:mb-0">
          <h1 className="text-2xl font-bold mb-2 text-white">
            {title}
          </h1>
          <p className={`${subtitleColor} dark:${darkSubtitleColor} text-sm mb-4`}>
            {subtitle}
          </p>

          <SummaryCards
            cards={summaryCards}
            textColor="text-white"
          />
        </div>

        <div className="flex flex-col space-y-3">
          {buttons.map((button, index) => (
            <Button
              key={index}
              onClick={button.onClick}
              variant={button.variant || 'primary'}
              size="sm"
              className={button.className}
            >
              <button.icon className="w-4 h-4 mr-2" />
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};