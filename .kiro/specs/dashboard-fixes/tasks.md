# Implementation Plan

## 1. Fix Route Configuration and Create Dedicated Pages

- [x] 1.1 Create Weather page component
  - Create `dashboard/src/pages/Weather.tsx` with detailed weather data view
  - Include WeatherTable, WeatherCharts, and ExportButtons components
  - Add pagination controls for weather log history
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 1.2 Create Settings page component
  - Create `dashboard/src/pages/Settings.tsx` with configuration options
  - Include theme toggle (light/dark mode)
  - Add auto-refresh interval configuration
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 1.3 Update App.tsx routes
  - Change `/weather` route to render `<Weather />` component
  - Change `/settings` route to render `<Settings />` component
  - Import new page components
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.4 Update Sidebar menu label
  - Rename "Explorar" to "Pokepaginação" in navItems array
  - _Requirements: 1.4_

- [x]* 1.5 Write unit tests for new pages
  - Create `Weather.test.tsx` with rendering tests
  - Create `Settings.test.tsx` with rendering tests
  - _Requirements: 5.1, 6.1_

## 2. Implement Location Filter Feature

- [x] 2.1 Create LocationFilter component
  - Create `dashboard/src/components/weather/LocationFilter.tsx`
  - Implement State dropdown with Brazilian states
  - Implement Municipality dropdown with dynamic loading based on selected state
  - _Requirements: 4.1, 4.2_

- [x] 2.2 Create useLocationFilter hook
  - Create `dashboard/src/hooks/useLocationFilter.ts`
  - Implement state management for selected state and city
  - Implement cascading behavior (reset city when state changes)
  - Use IBGE API or static data for Brazilian states/cities
  - _Requirements: 4.2, 4.3_

- [x]* 2.3 Write property test for location filter cascading
  - **Property 3: Location filter cascading behavior**
  - **Validates: Requirements 4.2, 4.3, 4.4**

- [x] 2.4 Integrate LocationFilter into Dashboard
  - Add LocationFilter component to Dashboard.tsx
  - Pass filter values to useWeatherLogs and useWeatherInsights hooks
  - Update weather service to accept state/city parameters
  - _Requirements: 4.3, 4.4, 4.5_

- [x]* 2.5 Write unit tests for LocationFilter
  - Test dropdown rendering
  - Test state selection behavior
  - Test city loading on state change
  - _Requirements: 4.1, 4.2_

## 3. Checkpoint - Ensure all tests pass
- [x] Ensure all tests pass, ask the user if questions arise.

## 4. Fix Insights Display

- [x] 4.1 Verify InsightsPanel component rendering
  - Review InsightsPanel.tsx for any rendering issues
  - Ensure all sub-components (StatisticsCard, TrendsCard, etc.) render correctly
  - Check for null/undefined handling in data display
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4.2 Verify useWeatherInsights hook
  - Check API endpoint configuration
  - Verify error handling and loading states
  - Ensure insights data is properly passed to components
  - _Requirements: 2.1, 2.7, 2.8_

- [x]* 4.3 Write property test for InsightsPanel data rendering
  - **Property 1: InsightsPanel renders all required data fields**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6**

## 5. Fix Temperature Chart

- [x] 5.1 Verify WeatherChart component
  - Review SimpleLineChart implementation
  - Ensure SVG rendering works correctly
  - Verify data point calculation and positioning
  - Check for edge cases (empty data, single data point)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x]* 5.2 Write property test for chart data points
  - **Property 2: Chart renders correct data points**
  - **Validates: Requirements 3.1, 3.2, 3.3**

## 6. Implement Settings Persistence

- [x] 6.1 Add settings persistence logic
  - Implement localStorage persistence for theme setting
  - Implement localStorage persistence for auto-refresh interval
  - Ensure settings are loaded on app initialization
  - _Requirements: 6.3_

- [x]* 6.2 Write property test for settings persistence
  - **Property 4: Settings persistence**
  - **Validates: Requirements 6.3**

## 7. Final Checkpoint - Ensure all tests pass
- Ensure all tests pass, ask the user if questions arise.

