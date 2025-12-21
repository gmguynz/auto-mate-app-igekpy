
# Web Compatibility Guide

This guide explains the changes made to ensure all interactive elements work properly on the web platform.

## Problem

React Native's `TouchableOpacity` and `Pressable` components don't automatically work well on web. They need specific styling to:
- Show the correct cursor (pointer for buttons, text for inputs)
- Prevent text selection when clicking buttons
- Provide visual feedback on interaction

## Solution

### 1. Web-Specific Styles

All interactive components now include web-specific styles:

```typescript
{
  cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  userSelect: Platform.OS === 'web' ? 'none' : undefined,
}
```

### 2. Input Fields

Text inputs have special cursor handling:

```typescript
{
  cursor: Platform.OS === 'web' ? 'text' : undefined,
  outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
}
```

### 3. Active Opacity

All `TouchableOpacity` components now have `activeOpacity={0.7}` for better visual feedback.

## Files Updated

- `components/button.tsx` - Added web cursor styles
- `app/(tabs)/admin.tsx` - Added web styles to all interactive elements
- `app/(tabs)/customers/reminders.tsx` - Added web styles to reminder cards
- `app/(tabs)/customers/index.tsx` - Added web styles to customer cards
- `app/(tabs)/customers/[id].tsx` - Added web styles to detail screen
- `app/(tabs)/customers/add.tsx` - Added web styles to add screen
- `styles/webStyles.ts` - Created reusable web style utilities

## Testing

To test on web:
1. Run `npm run web`
2. Open http://localhost:8081 in your browser
3. Test all buttons and interactive elements
4. Verify cursor changes appropriately
5. Check that text doesn't get selected when clicking buttons

## Common Issues

### Buttons Not Clickable
- Ensure `cursor: 'pointer'` is set
- Check that `onPress` handler is defined
- Verify no overlapping elements blocking clicks

### Text Selection on Click
- Add `userSelect: 'none'` to button styles
- Apply to both container and text elements

### No Visual Feedback
- Add `activeOpacity={0.7}` to TouchableOpacity
- Consider adding hover states for web

## Best Practices

1. **Always add cursor styles** to interactive elements
2. **Use activeOpacity** for visual feedback
3. **Prevent text selection** in buttons
4. **Test on web** after making UI changes
5. **Use Platform.OS** checks for web-specific code
