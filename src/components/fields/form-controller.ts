// form-controller.ts
import { createFieldController, FieldController } from "./FieldEdit";

export type FormController = {
  fieldControllers: Record<string, FieldController>;

  registerField: (fieldIdentifier: string) => FieldController;

  validate: () => Promise<boolean>;
  getValues: () => Record<string, any>;
  reset: (val?: any) => void;
};

// form-controller.ts
export default function createFormController(): FormController {
  const fieldControllers: Record<string, FieldController> = {};

  const registerField = (fieldIdentifier: string): FieldController => {
    if (!fieldControllers[fieldIdentifier]) {
      fieldControllers[fieldIdentifier] = createFieldController();
    }
    return fieldControllers[fieldIdentifier];
  };

  const validate = async (): Promise<boolean> => {
    const entries = Object.values(fieldControllers);
    if (entries.length === 0) return true;

    let resolved = false;
    let pending = entries.length;

    return new Promise<boolean>((resolve) => {
      entries.forEach((ctrl) => {
        const p = ctrl.validate
          ? ctrl.validate({ debounceUnique: false, force: true })
          : Promise.resolve(true);

        p.then((ok) => {
          if (resolved) return;

          if (!ok) {
            resolved = true;

            if (ctrl.target) {
              setTimeout(() => ctrl.target!.focus(), 300);
              ctrl.target.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }

            resolve(false);
            return;
          }

          pending--;
          if (pending === 0) {
            resolved = true;
            resolve(true);
          }
        }).catch(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        });
      });
    });
  };

  const getValues = (): Record<string, any> => {
    const values: Record<string, any> = {};
    for (const [key, ctrl] of Object.entries(fieldControllers)) {
      if (ctrl.getValue && ctrl.getValue() !== undefined) {
        values[key] = ctrl.getValue();
      }
    }
    return values;
  };

  const reset = () => {
    Object.values(fieldControllers).forEach(ctrl => ctrl.reset?.());
  };

  return {
    fieldControllers,
    registerField,
    validate,
    getValues,
    reset
  };
}
