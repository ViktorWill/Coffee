# Planning Guide

A comprehensive coffee dialing assistant that helps baristas and coffee enthusiasts achieve perfect extractions for both espresso and filter coffee by tracking beans, grind settings, and extraction results with intelligent recommendations.

**Experience Qualities**: 
1. **Professional** - Clean, precise interface that reflects the technical nature of coffee extraction with clear data visualization and organized tracking
2. **Intuitive** - Effortless workflow from bean registration to extraction logging, with smart automation for coffee package photo analysis
3. **Supportive** - Intelligent advisor provides actionable guidance based on extraction parameters and taste feedback, demystifying the dialing process

**Complexity Level**: Light Application (multiple features with basic state)
This app manages coffee bean records, extraction sessions, and provides recommendations but doesn't require complex multi-view architecture or heavy computational features beyond LLM-based photo analysis.

## Essential Features

### User Authentication & Account Management
- **Functionality**: Simple username-based or GitHub OAuth authentication with per-user data storage
- **Purpose**: Allow multiple users to track their own coffee beans and extractions independently
- **Trigger**: App launch shows auth dialog; user can sign in, create account, or use GitHub
- **Progression**: Enter credentials → Authenticate → Load user-specific data → Begin tracking
- **Success criteria**: Each user sees only their data, seamless sign-out/switch accounts, persistent sessions

### Coffee Package Photo Analysis
- **Functionality**: Upload photo of coffee bag, extract bean name, blend type, and taste notes using vision-capable LLM
- **Purpose**: Eliminates manual data entry and ensures accurate bean information capture
- **Trigger**: User taps upload button or camera icon on new bean creation screen
- **Progression**: Select image → LLM analyzes package → Extracts name/blend/notes → Pre-fills bean form → User confirms/edits → Save bean
- **Success criteria**: 80%+ accuracy on coffee name extraction, graceful handling of unclear images with manual override option

### Dual Coffee Type Management (Espresso & Filter)
- **Functionality**: Separate workflows and parameters for espresso vs filter coffee brewing
- **Purpose**: Different extraction methods require different grind settings, ratios, and evaluation criteria
- **Trigger**: User selects tab/toggle between Espresso and Filter modes
- **Progression**: Select mode → View mode-specific beans → Add extractions with appropriate parameters → Get mode-specific advice
- **Success criteria**: Clear visual distinction, no parameter confusion between modes, separate bean lists if needed

### Bean Library Management
- **Functionality**: Store and manage coffee beans with grind settings, extraction history, and taste profiles
- **Purpose**: Track multiple coffees simultaneously and maintain historical performance data
- **Trigger**: User uploads package photo or manually creates bean entry
- **Progression**: Create bean → Set initial grind setting (Mazzer Philos scale) → Log extractions → View history → Archive when finished
- **Success criteria**: Easy browsing, search/filter capability, clear visual state for active vs finished beans

### Extraction Session Logging
- **Functionality**: Record extraction details including grind setting, time, output weight, and taste evaluation
- **Purpose**: Build data history to understand what works and what doesn't for each bean
- **Trigger**: User selects "Log Extraction" on a bean card
- **Progression**: Select bean → Enter grind setting → Input time (seconds) → Input output (grams) → Select taste descriptors → Save → View advisor feedback
- **Success criteria**: Quick entry flow (<30 seconds), clear input validation, immediate feedback visibility

### Extraction History Visualization
- **Functionality**: Charts showing trends in grind settings, extraction time, output, and brew ratios over time
- **Purpose**: Visual feedback helps users identify patterns and optimize their dialing process
- **Trigger**: User opens history dialog and switches to Charts tab
- **Progression**: View list → Switch to charts → Analyze trends → Identify optimization opportunities
- **Success criteria**: Clear line charts for grind/time/output, perfect shots highlighted, responsive and readable

### Tasting Profiles with Flavor Wheel
- **Functionality**: Interactive flavor wheel visualization allowing users to select and visualize flavor notes across multiple categories (fruity, nutty, chocolate, floral, spicy, earthy)
- **Purpose**: Provide a professional, comprehensive way to capture nuanced tasting experiences beyond simple descriptors
- **Trigger**: User clicks "Create Tasting Profile" on a bean card or after logging an extraction
- **Progression**: Open tasting dialog → Select flavors from wheel categories → Add intensity ratings → Save profile → View as visual representation on bean card
- **Success criteria**: Intuitive wheel interaction, clear flavor categorization, beautiful visualization of selected flavors, ability to compare profiles across extractions

### Intelligent Dialing Advisor
- **Functionality**: Analyzes extraction parameters and taste feedback to recommend grind setting adjustments
- **Purpose**: Educate users on cause-effect relationships and accelerate perfect extraction discovery
- **Trigger**: Automatically appears after logging extraction with taste feedback
- **Progression**: User logs extraction → System analyzes time/weight/taste → Generates specific adjustment advice → Displays grind direction (finer/coarser) + reasoning
- **Success criteria**: Recommendations align with espresso/filter best practices, clear actionable instructions, references Mazzer Philos adjustment method

## Edge Case Handling

- **Unclear Package Photos**: If LLM cannot confidently extract bean info, show low-confidence warning and enable full manual entry mode
- **Missing Extraction Data**: Allow partial saves with warnings; some users may not have scales or timers for every extraction
- **First-Time Extractions**: Provide baseline starting recommendations for Mazzer Philos settings when no history exists
- **Conflicting Taste Notes**: When user selects contradictory tastes (e.g., sour + bitter), flag and ask for primary issue
- **Empty States**: Show helpful onboarding messages when no beans exist, with quick-start guide linking to dialing resources
- **Very Old Beans**: Optionally warn when extraction dates are >30 days old (stale coffee affects results)

## Design Direction

The design should evoke precision, warmth, and expertise—like a specialty coffee shop's lab notebook meets modern digital tools. Visual hierarchy should emphasize current extraction data while keeping historical context accessible. The interface should feel clean and technical without being cold, using rich coffee-inspired colors balanced with plenty of breathing room.

## Color Selection

A warm, earthy palette inspired by coffee roasting stages with technical precision accents.

- **Primary Color**: Deep espresso brown `oklch(0.25 0.04 60)` - Represents coffee expertise and grounds the interface with professional authority
- **Secondary Colors**: 
  - Warm cream `oklch(0.92 0.02 80)` for cards and secondary backgrounds - evokes milk foam and provides gentle contrast
  - Rich caramel `oklch(0.58 0.10 70)` for data highlights and secondary CTAs - references medium roasts
- **Accent Color**: Vibrant extraction orange `oklch(0.68 0.18 45)` - Catches attention for primary actions and successful extractions, recalls crema
- **Foreground/Background Pairings**: 
  - Background (Warm Cream `oklch(0.97 0.01 85)`): Deep espresso text `oklch(0.20 0.03 60)` - Ratio 12.8:1 ✓
  - Primary (Deep Espresso `oklch(0.25 0.04 60)`): Cream text `oklch(0.97 0.01 85)` - Ratio 11.2:1 ✓
  - Accent (Extraction Orange `oklch(0.68 0.18 45)`): Deep espresso text `oklch(0.20 0.03 60)` - Ratio 5.1:1 ✓
  - Card (Light Cream `oklch(0.95 0.01 80)`): Primary text `oklch(0.20 0.03 60)` - Ratio 13.5:1 ✓

## Font Selection

Typography should balance technical precision with approachable warmth, using a modern geometric sans for clarity and a subtle monospace for numerical data.

- **Typographic Hierarchy**: 
  - H1 (Screen Titles): Space Grotesk Bold / 32px / -0.02em letter spacing - Strong presence for mode headers
  - H2 (Bean Names): Space Grotesk SemiBold / 24px / -0.01em - Distinguishes individual coffee entries
  - H3 (Section Labels): Space Grotesk Medium / 18px / normal - Organizes extraction parameters
  - Body (Descriptions): Space Grotesk Regular / 16px / 1.6 line height - Comfortable reading for taste notes
  - Data (Numbers/Settings): JetBrains Mono Medium / 16px / tabular-nums - Precise alignment for grind/time/weight values
  - Labels (Form Fields): Space Grotesk Medium / 14px / 0.01em - Clear input identification
  - Captions (Timestamps): Space Grotesk Regular / 13px / muted color - Subtle contextual info

## Animations

Animations should reinforce the cause-and-effect nature of coffee extraction - smooth, purposeful movements that feel organic like water flowing through coffee grounds.

- **Card Reveals**: Gentle scale-up (0.97 → 1) with 300ms ease-out when beans load, suggesting freshness
- **Extraction Logging**: Smooth slide-in modal from bottom with backdrop blur, 250ms spring physics
- **Advisor Feedback**: Fade + slide up (20px) after extraction save, 400ms delay to build anticipation
- **Tab Switching**: Crossfade between Espresso/Filter modes with 200ms duration, maintaining spatial consistency
- **Success States**: Subtle pulse on save confirmation with accent color glow, 150ms duration
- **Grind Adjustment Indicators**: Directional arrows animate in (finer up, coarser down) with 300ms bounce
- **Photo Upload**: Progress indicator with circular fill animation during LLM processing

## Component Selection

- **Components**: 
  - `Tabs` for Espresso/Filter mode switching with custom styling for prominent selection state
  - `Card` for bean entries with hover elevation increase and border accent
  - `Dialog` for extraction logging forms with full-screen mobile adaptation
  - `Button` with variants: primary (accent) for CTAs, secondary (cream) for cancel/back, ghost for icon actions
  - `Input` and `Label` for extraction parameter entry with focused state using accent ring
  - `Badge` for taste descriptors (multi-select chips with toggle states)
  - `Select` for structured taste choice dropdowns
  - `Avatar` or `AspectRatio` for coffee package photo display
  - `Separator` to divide bean details from extraction history
  - `ScrollArea` for long extraction history lists
  - `Skeleton` for loading states during LLM analysis
  - `Alert` for advisor recommendations with custom icon and accent border
  
- **Customizations**: 
  - Custom photo upload zone with dashed border and upload icon, drag-drop support
  - Grind setting slider custom-styled with Mazzer Philos tick marks and numerical display
  - Extraction timeline visualization (custom component) showing historical grind/taste progression
  - Custom taste selector with icon + label chips (sour=lemon, bitter=herbs, perfect=check, etc.)
  
- **States**: 
  - Buttons: Default with shadow, hover with slight lift and saturation boost, active with inset shadow, disabled with opacity reduction
  - Cards: Default flat, hover with border accent and slight elevation, selected (active bean) with accent left border
  - Inputs: Default with subtle border, focus with accent ring and label color shift, error with destructive color, success with green accent
  - Badges (taste): Unselected with muted background, selected with accent background and white text, hover with opacity change
  
- **Icon Selection**: 
  - `Coffee` for espresso mode indicator
  - `Funnel` for filter coffee mode indicator  
  - `Upload` or `Camera` for photo capture action
  - `FloppyDisk` for save extraction
  - `ArrowUp` / `ArrowDown` for grind finer/coarser recommendations
  - `Lightbulb` for advisor tips
  - `Plus` for new bean/extraction creation
  - `Clock` for extraction time
  - `Scales` for weight/output
  - `Barcode` or `Package` for bean package reference
  - `ChartLine` for extraction history
  
- **Spacing**: 
  - Page padding: `p-6` desktop, `p-4` mobile
  - Card internal padding: `p-6`
  - Stacked elements gap: `gap-4` for related groups, `gap-6` for distinct sections
  - Form field spacing: `gap-3` for label-input pairs
  - Button internal: `px-6 py-3` for primary actions, `px-4 py-2` for secondary
  - Grid gaps: `gap-4` for bean cards grid
  
- **Mobile**: 
  - Tabs convert to full-width toggles at top with larger touch targets (min 48px height)
  - Bean cards stack vertically in single column below 768px
  - Extraction dialog becomes full-screen sheet on mobile with slide-up animation
  - Grind slider increases touch target size with larger thumb
  - Navigation sticky at top on scroll for quick mode switching
  - Photo upload zone expands to full width with larger tap area
