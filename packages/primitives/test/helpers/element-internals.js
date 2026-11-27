// happy-dom has no ElementInternals: a stand-in that records the form value and validity.
// Import this module for its side effect before an element under test calls attachInternals().
if (!('attachInternals' in HTMLElement.prototype))
  Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
    value() {
      return {
        formValue: /** @type {unknown} */ (null),
        validity: { valid: true, valueMissing: false },
        validationMessage: '',
        states: new Set(),
        form: null,
        labels: [],
        /** @param {unknown} value */
        setFormValue(value) {
          this.formValue = value;
        },
        /** @param {Record<string, boolean>} flags @param {string} [message] */
        setValidity(flags, message = '') {
          this.validity = { valid: !Object.values(flags).some(Boolean), valueMissing: Boolean(flags.valueMissing) };
          this.validationMessage = message;
        },
        checkValidity() {
          return this.validity.valid;
        },
        reportValidity() {
          return this.validity.valid;
        },
      };
    },
  });
