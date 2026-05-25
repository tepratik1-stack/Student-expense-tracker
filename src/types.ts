export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'Food' | 'Travel' | 'Study' | 'Recharge' | 'Other';
  timestamp: number; // For sorting and today comparison
}

export type ExpenseCategory = 'Food' | 'Travel' | 'Study' | 'Recharge' | 'Other';

export interface CodeSnippet {
  fileName: string;
  filePath: string;
  language: string;
  description: string;
  code: string;
}
