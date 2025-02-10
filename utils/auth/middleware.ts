import { z } from "zod";

export type ActionState = {
  error?: string;
  success?: string;
  fieldData?: Record<string, any>; //eslint-disable-line
  [key: string]: any; //eslint-disable-line
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  //eslint-disable-line
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>( //eslint-disable-line
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as T;
    }

    return action(result.data, formData);
  };
}