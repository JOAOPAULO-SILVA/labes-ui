# Shared UI Design System

PrimeNG is an implementation detail of `shared/ui`. Feature pages should use `app-*` components instead of importing PrimeNG components directly.

Each component represents a UI intention, not just an HTML element wrapper:

- `app-input`: simple textual input only (`text`, `email`, `url`, `tel` while there is no phone-specific component).
- `app-select`: choosing one option from a list. Use `searchable` for long lists: it adds a search field and switches to virtual scroll above 100 options. Options may carry a `description` (shown under the label and included in the search).
- `app-datepicker`: selecting a date. By default it emits `Date | null` with `dateFormat="dd/mm/yy"` for pt-BR display. Use `valueMode="string"` only when a screen contract needs a formatted string, and set `dateFormat` explicitly for that contract.
- Future specialized fields should get their own wrappers, for example `app-timepicker`, `app-number-input`, `app-password-input`, `app-search-input`, `app-file-upload`, and document/currency/percentage inputs.

Do not expand `app-input` to support behavior-heavy types like `date`, `time`, `number`, `password`, `file`, `color`, `range`, or `datetime-local`. Add a specialized component when the user intent has its own formatting, validation, mask, or interaction model.

Specialized wrappers should expose project-owned names and types. Avoid leaking PrimeNG prop names unless the concept is already generic in the product language. For example, `app-datepicker` uses `valueMode` (`date` or `string`) instead of exposing PrimeNG implementation details as the public API.
