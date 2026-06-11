import { IconName } from '../app-icon/app-icon.component';

export interface MenuItem {
  id?: string;
  label?: string;
  icon?: IconName;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean; // If true, renders a separator instead of an item
  children?: MenuItem[]; // For nested submenus (future proofing)
}

export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
