import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardData {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  condition?: boolean; // Used to conditionally show/hide cards
}

interface SummaryCardsProps {
  cards: SummaryCardData[];
  textColor?: string;
  hiddenPlaceholder?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  cards,
  textColor = "text-white",
  hiddenPlaceholder = "••••"
}) => {
  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;

        // Skip rendering if condition is false
        if (card.condition === false) {
          return null;
        }

        return (
          <div
            key={card.id}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/20 dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-bold ${textColor}`}>
                  {card.value}
                </div>
                <div className={`text-xs ${textColor.replace('text-', 'text-').replace('-400', '-200').replace('-300', '-200')}`}>
                  {card.label}
                </div>
              </div>
              <Icon className={`w-4 h-4 ${card.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};