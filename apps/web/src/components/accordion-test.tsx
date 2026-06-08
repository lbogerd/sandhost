import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@wtrn/components/accordion"

export const AccordionTest = () => {
	return (
		<Accordion defaultValue={["item-1"]}>
			<AccordionItem value="item-1">
				<AccordionTrigger>Is it accessible?</AccordionTrigger>
				<AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
			</AccordionItem>
		</Accordion>
	)
}
