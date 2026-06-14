// A clear visual break between an epic block and its neighbours (loose tasks or
// other epics) in the list view. Taller and dimmer than a normal row border so the
// boundary reads as a section break rather than just another row.
export function EpicBlockSeparator() {
  return (
    <div
      role="separator"
      className="h-2 bg-lift/40 border-y border-line-dim"
    />
  );
}
