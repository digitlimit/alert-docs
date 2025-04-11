import type { AstroBuiltinAttributes } from 'astro';
import type { HTMLAttributes } from 'astro/types';
import { z } from 'astro/zod';
import { I18nBadgeConfigSchema } from './badge';
import { stripLeadingAndTrailingSlashes } from '../utils/path';

const SidebarBaseSchema = z.object({
	/** The visible label for this item in the sidebar. */
	label: z.string(),
	/** Translations of the `label` for each supported language. */
	translations: z.record(z.string()).default({}),
	/** Adds a badge to the item */
	badge: I18nBadgeConfigSchema(),
});

const SidebarGroupSchema = SidebarBaseSchema.extend({
	/** Whether this item should be collapsed by default. */
	collapsed: z.boolean().default(false),
});

// HTML attributes that can be added to an anchor element, validated as
// `Record<string, string | number | boolean | undefined>` but typed as `HTMLAttributes<'a'>`
// for user convenience.
const linkHTMLAttributesSchema = z.record(
	z.union([z.string(), z.number(), z.boolean(), z.undefined()])
) as z.Schema<Omit<HTMLAttributes<'a'>, keyof AstroBuiltinAttributes | 'children'>>;
export type LinkHTMLAttributes = z.infer<typeof linkHTMLAttributesSchema>;

export const SidebarLinkItemHTMLAttributesSchema = () => linkHTMLAttributesSchema.default({});

const SidebarLinkItemSchema = SidebarBaseSchema.extend({
	/** The link to this item’s content. Can be a relative link to local files or the full URL of an external page. */
	link: z.string(),
	/** HTML attributes to add to the link item. */
	attrs: SidebarLinkItemHTMLAttributesSchema(),
}).strict();
export type SidebarLinkItem = z.infer<typeof SidebarLinkItemSchema>;

const AutoSidebarGroupSchema = SidebarGroupSchema.extend({
	/** Enable autogenerating a sidebar category from a specific docs directory. */
	autogenerate: z.object({
		/** The directory to generate sidebar items for. */
		directory: z.string().transform(stripLeadingAndTrailingSlashes),
		/**
		 * Whether the autogenerated subgroups should be collapsed by default.
		 * Defaults to the `AutoSidebarGroup` `collapsed` value.
		 */
		collapsed: z.boolean().optional(),
		// TODO: not supported by Docusaurus but would be good to have
		/** How many directories deep to include from this directory in the sidebar. Default: `Infinity`. */
		// depth: z.number().optional(),
	}),
}).strict();
export type AutoSidebarGroup = z.infer<typeof AutoSidebarGroupSchema>;

type ManualSidebarGroupInput = z.input<typeof SidebarGroupSchema> & {
	/** Array of links and subcategories to display in this category. */
	items: Array<
		| z.input<typeof SidebarLinkItemSchema>
		| z.input<typeof AutoSidebarGroupSchema>
		| z.input<typeof InternalSidebarLinkItemSchema>
		| z.input<typeof InternalSidebarLinkItemShorthandSchema>
		| ManualSidebarGroupInput
	>;
};

type ManualSidebarGroupOutput = z.output<typeof SidebarGroupSchema> & {
	/** Array of links and subcategories to display in this category. */
	items: Array<
		| z.output<typeof SidebarLinkItemSchema>
		| z.output<typeof AutoSidebarGroupSchema>
		| z.output<typeof InternalSidebarLinkItemSchema>
		| z.output<typeof InternalSidebarLinkItemShorthandSchema>
		| ManualSidebarGroupOutput
	>;
};

const ManualSidebarGroupSchema: z.ZodType<
	ManualSidebarGroupOutput,
	z.ZodTypeDef,
	ManualSidebarGroupInput
> = SidebarGroupSchema.extend({
	/** Array of links and subcategories to display in this category. */
	items: z.lazy(() =>
		z
			.union([
				SidebarLinkItemSchema,
				ManualSidebarGroupSchema,
				AutoSidebarGroupSchema,
				InternalSidebarLinkItemSchema,
				InternalSidebarLinkItemShorthandSchema,
			])
			.array()
	),
}).strict();

const InternalSidebarLinkItemSchema = SidebarBaseSchema.partial({ label: true }).extend({
	/** The link to this item’s content. Must be a slug of a Content Collection entry. */
	slug: z.string(),
	/** HTML attributes to add to the link item. */
	attrs: SidebarLinkItemHTMLAttributesSchema(),
});
const InternalSidebarLinkItemShorthandSchema = z
	.string()
	.transform((slug) => InternalSidebarLinkItemSchema.parse({ slug }));
export type InternalSidebarLinkItem = z.output<typeof InternalSidebarLinkItemSchema>;

export const SidebarItemSchema = z.union([
	SidebarLinkItemSchema,
	ManualSidebarGroupSchema,
	AutoSidebarGroupSchema,
	InternalSidebarLinkItemSchema,
	InternalSidebarLinkItemShorthandSchema,
]);
export type SidebarItem = z.infer<typeof SidebarItemSchema>;
