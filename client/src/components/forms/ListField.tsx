import { TagInputField } from './TagInputField';

export function ListField({ value = [], onChange }: { value?: string[]; onChange: (v: string[]) => void }) {
  return (
    <TagInputField
      value={value}
      onChange={onChange}
      placeholder="Type tags separated by commas"
    />
  );
}

