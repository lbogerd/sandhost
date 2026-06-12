import {
	type ComponentProps,
	type ReactElement,
	type ReactNode,
	createContext,
	cloneElement,
	isValidElement,
	useActionState,
	useContext,
	useId,
} from "react"
import * as z from "zod"

import { Button } from "./button.tsx"
import { Field, FieldDescription, FieldError, FieldLabel } from "./field.tsx"

type FormValues = Record<string, FormDataEntryValue | FormDataEntryValue[]>
type FieldErrors = Record<string, string[]>

type FormState<TValues extends FormValues = FormValues, TResult = unknown> = {
	values: Partial<TValues>
	fieldErrors: FieldErrors
	formErrors: string[]
	result?: TResult
	status: "idle" | "error" | "success"
}

type FormSubmitContext<TSchema extends z.ZodType, TResult> = {
	formData: FormData
	previousState: FormState<Partial<z.input<TSchema>> & FormValues, TResult>
}

type FormProps<TSchema extends z.ZodType, TResult> = Omit<
	ComponentProps<"form">,
	"action" | "children" | "onSubmit"
> & {
	schema: TSchema
	children:
		| ReactNode
		| ((form: FormContextValue<Partial<z.input<TSchema>> & FormValues, TResult>) => ReactNode)
	defaultValues?: Partial<z.input<TSchema>> & FormValues
	onSubmit?: (
		values: z.output<TSchema>,
		context: FormSubmitContext<TSchema, TResult>,
	) => Promise<TResult> | TResult
}

type FormContextValue<TValues extends FormValues = FormValues, TResult = unknown> = {
	action: (payload: FormData) => void
	fieldErrors: FieldErrors
	formErrors: string[]
	getFieldErrors: (name: string) => string[]
	getFieldValue: (name: string) => FormDataEntryValue | FormDataEntryValue[] | undefined
	isPending: boolean
	result?: TResult
	status: FormState<TValues, TResult>["status"]
	values: Partial<TValues>
}

type FormFieldContextValue = {
	id: string
	name: string
}

type ControlElementProps = {
	"aria-describedby"?: string
	defaultChecked?: boolean
	defaultValue?: unknown
	id?: string
	multiple?: boolean
	name?: string
	type?: string
	value?: unknown
	[key: string]: unknown
}

type FormControlProps = Partial<ControlElementProps> & {
	children: ReactElement<ControlElementProps>
}

type FormFieldProps = ComponentProps<typeof Field> & {
	name: string
}

type FormMessageProps = Omit<ComponentProps<typeof FieldError>, "errors"> & {
	errors?: string[]
}

const emptyState: FormState = {
	values: {},
	fieldErrors: {},
	formErrors: [],
	status: "idle",
}

const FormContext = createContext<FormContextValue | null>(null)
const FormFieldContext = createContext<FormFieldContextValue | null>(null)

function Form<TSchema extends z.ZodType, TResult = unknown>({
	children,
	defaultValues,
	onSubmit,
	schema,
	...props
}: FormProps<TSchema, TResult>) {
	type Values = Partial<z.input<TSchema>> & FormValues

	const initialState: FormState<Values, TResult> = {
		...emptyState,
		values: defaultValues ?? {},
	} as FormState<Values, TResult>

	const [state, action, isPending] = useActionState(
		async (previousState: FormState<Values, TResult>, formData: FormData) => {
			const values = formDataToObject(formData) as Values
			const parsed = schema.safeParse(values)

			if (!parsed.success) {
				const flattened = parsed.error.flatten()

				return {
					values,
					fieldErrors: flattened.fieldErrors as FieldErrors,
					formErrors: flattened.formErrors,
					status: "error",
				} satisfies FormState<Values, TResult>
			}

			let result: TResult | undefined

			try {
				result = await onSubmit?.(parsed.data, {
					formData,
					previousState,
				})
			} catch (error) {
				return {
					values,
					fieldErrors: {},
					formErrors: [getErrorMessage(error)],
					status: "error",
				} satisfies FormState<Values, TResult>
			}

			return {
				values,
				fieldErrors: {},
				formErrors: [],
				result,
				status: "success",
			} satisfies FormState<Values, TResult>
		},
		initialState,
	)

	const context: FormContextValue<Values, TResult> = {
		action,
		fieldErrors: state.fieldErrors,
		formErrors: state.formErrors,
		getFieldErrors: (name) => state.fieldErrors[name] ?? [],
		getFieldValue: (name) => state.values[name],
		isPending,
		result: state.result,
		status: state.status,
		values: state.values,
	}

	return (
		<FormContext.Provider value={context as FormContextValue}>
			<form
				action={action}
				data-pending={isPending ? "" : undefined}
				data-status={state.status}
				noValidate
				{...props}
			>
				{typeof children === "function" ? children(context) : children}
			</form>
		</FormContext.Provider>
	)
}

function FormField({ children, name, ...props }: FormFieldProps) {
	const fallbackId = useId()
	const field = useFormField(name)
	const id = props.id ?? fallbackId
	const invalid = field.getFieldErrors(name).length > 0

	return (
		<FormFieldContext.Provider value={{ id, name }}>
			<Field data-invalid={invalid ? "true" : undefined} data-name={name} {...props}>
				{children}
			</Field>
		</FormFieldContext.Provider>
	)
}

function FormLabel({ children, ...props }: ComponentProps<typeof FieldLabel>) {
	const field = useCurrentFormField()

	return (
		<FieldLabel htmlFor={field.controlId} {...props}>
			{children}
		</FieldLabel>
	)
}

function FormControl({ children, ...props }: FormControlProps) {
	const field = useCurrentFormField()
	const errors = field.errors
	const describedBy = [
		props["aria-describedby"],
		field.descriptionId,
		errors.length ? field.messageId : null,
	]
		.filter(Boolean)
		.join(" ")

	if (!isValidElement<ControlElementProps>(children)) {
		throw new Error("FormControl expects a single React element child.")
	}

	const childProps = children.props
	const controlType = props.type ?? childProps.type
	const hasValueProp =
		childProps.value !== undefined ||
		childProps.defaultValue !== undefined ||
		childProps.defaultChecked !== undefined

	return cloneElement(children, {
		"aria-describedby": describedBy || undefined,
		"aria-invalid": errors.length > 0 || undefined,
		id: field.controlId,
		name: field.name,
		...(hasValueProp
			? {}
			: getDefaultControlProps(field.value, {
					multiple: Boolean(childProps.multiple),
					type: controlType,
					value: childProps.value,
				})),
		...props,
	})
}

function FormDescription(props: ComponentProps<typeof FieldDescription>) {
	const field = useCurrentFormField()

	return <FieldDescription id={field.descriptionId} {...props} />
}

function FormMessage({ children, errors, ...props }: FormMessageProps) {
	const field = useCurrentFormField()
	const messages = errors ?? field.errors
	const content = children ?? messages[0]

	if (!content) {
		return null
	}

	return (
		<FieldError id={field.messageId} {...props}>
			{content}
		</FieldError>
	)
}

function FormErrorList({
	errors,
	...props
}: Omit<ComponentProps<typeof FieldError>, "errors"> & { errors?: string[] }) {
	const form = useForm()
	const messages = errors ?? form.formErrors

	if (!messages.length) {
		return null
	}

	return (
		<FieldError {...props}>
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{messages.map((message) => (
					<li key={message}>{message}</li>
				))}
			</ul>
		</FieldError>
	)
}

function FormSubmit(props: ComponentProps<typeof Button>) {
	const form = useForm()

	return (
		<Button {...props} disabled={form.isPending || props.disabled} type={props.type ?? "submit"} />
	)
}

function useForm<TValues extends FormValues = FormValues, TResult = unknown>() {
	const context = useContext(FormContext)

	if (!context) {
		throw new Error("useForm must be used inside a Form.")
	}

	return context as FormContextValue<TValues, TResult>
}

function useFormField(name?: string) {
	const form = useForm()

	if (!name) {
		return form
	}

	return {
		...form,
		errors: form.getFieldErrors(name),
		name,
		value: form.getFieldValue(name),
	}
}

function useCurrentFormField() {
	const field = useContext(FormFieldContext)
	const form = useForm()

	if (!field) {
		throw new Error("Form field components must be used inside a FormField.")
	}

	return {
		controlId: `${field.id}-control`,
		descriptionId: `${field.id}-description`,
		errors: form.getFieldErrors(field.name),
		messageId: `${field.id}-message`,
		name: field.name,
		value: form.getFieldValue(field.name),
	}
}

function formDataToObject(formData: FormData) {
	const values: FormValues = {}

	for (const [key, value] of formData.entries()) {
		const existing = values[key]

		if (existing === undefined) {
			values[key] = value
			continue
		}

		values[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
	}

	return values
}

function getDefaultControlProps(
	value: FormDataEntryValue | FormDataEntryValue[] | undefined,
	options: { multiple: boolean; type: string | undefined; value: unknown },
) {
	if (value === undefined || value instanceof File || options.type === "file") {
		return {}
	}

	if (options.type === "checkbox" || options.type === "radio") {
		const optionValue = typeof options.value === "string" ? options.value : "on"
		const checked = Array.isArray(value)
			? value.includes(optionValue)
			: value === optionValue || value === "true"

		return { defaultChecked: checked }
	}

	if (Array.isArray(value)) {
		const strings = value.filter((entry) => typeof entry === "string")
		return { defaultValue: options.multiple ? strings : strings[0] }
	}

	return { defaultValue: value }
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Something went wrong."
}

export {
	Form,
	FormControl,
	FormDescription,
	FormErrorList,
	FormField,
	FormLabel,
	FormMessage,
	FormSubmit,
	useForm,
	useFormField,
}
export type { FieldErrors, FormContextValue, FormProps, FormState, FormSubmitContext, FormValues }
