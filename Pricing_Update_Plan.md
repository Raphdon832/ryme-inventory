# Pricing Update Plan

## Margin-First Pricing
- [x] Default product pricing mode should be **Margin**, not Markup.
- [x] Margin is calculated inside the final sales price.
- [x] Example: sales price `N100,000` with `30%` margin means `N30,000` profit and `N70,000` Cost of Production.
- [x] Markup remains available as a selectable toggle for users who want to add profit on top of Cost of Production.

## Add/Edit Product
- [x] Add Product should open in Margin mode by default.
- [x] Edit Product should prefer the saved pricing mode, falling back to Margin for older products.
- [x] Margin mode should collect Sales Price and Margin Percentage.
- [x] Markup mode should collect Cost of Production plus Markup Percentage or Markup Amount.

## Bulk Price Updates
- [x] Inventory selection mode should support updating prices for two or more selected products.
- [x] Bulk price update should default to Margin mode.
- [x] Margin bulk update should apply the entered margin inside each selected product's existing sales price.
- [x] Margin bulk update should also support an optional fixed sales price, so `N100,000` at `30%` margin becomes `N70,000` CoP and `N30,000` profit.
- [x] Fixed sales price and markup update options should remain available.
