import * as React from "react"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox"

export interface SelectableItem {
  id: string | number;
  name: string;
}

interface ComboboxMultipleProps {
  items: SelectableItem[];
  placeHolder: string;
}

export function ComboboxMultiple({items, placeHolder}: ComboboxMultipleProps) {
  const [value, setValue] = React.useState<string[]>([])

  return (
    <Combobox
      items={items}
      multiple
      value={value}
      onValueChange={setValue}
    >
      <ComboboxChips>
        <ComboboxValue>
          {value.map((val) => {
            const item = items.find(i => i.id.toString() === val);
            return (
              <ComboboxChip key={val}>
                {item?.name || val}
              </ComboboxChip>
            );
          })}
        </ComboboxValue>
        <ComboboxChipsInput placeholder={placeHolder} />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item: SelectableItem) => (
            <ComboboxItem 
                key={item.id} 
                value={item.id.toString()} 
            >
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}