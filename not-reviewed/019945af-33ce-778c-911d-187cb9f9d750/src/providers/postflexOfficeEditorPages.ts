import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Creates a new UI page in FlexOffice.
 *
 * This operation creates the page with specified properties such as name,
 * optional description, status, and optional theme reference. It checks for
 * name uniqueness among non-deleted pages to prevent conflicts. The create
 * timestamps are set to current time in ISO string format.
 *
 * Authorization requires the caller to have editor role.
 *
 * @param props - Object containing editor authentication payload and body data
 *   for page creation
 * @param props.editor - Authenticated editor user payload
 * @param props.body - Data for the new page creation conforming to
 *   IFlexOfficePage.ICreate
 * @returns The newly created UI page object as IFlexOfficePage
 * @throws {Error} If a page with the same name already exists and is not
 *   deleted
 */
export async function postflexOfficeEditorPages(props: {
  editor: EditorPayload;
  body: IFlexOfficePage.ICreate;
}): Promise<IFlexOfficePage> {
  const { editor, body } = props;

  // Check for existing page with the same name that is not soft deleted
  const existing = await MyGlobal.prisma.flex_office_pages.findFirst({
    where: {
      name: body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error(`Page with name '${body.name}' already exists.`);
  }

  // Generate new UUID and current timestamps
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  // Create the new page
  const created = await MyGlobal.prisma.flex_office_pages.create({
    data: {
      id,
      flex_office_page_theme_id: body.flex_office_page_theme_id ?? null,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created page with correct typings and conversions
  return {
    id: created.id,
    flex_office_page_theme_id: created.flex_office_page_theme_id ?? undefined,
    name: created.name,
    description: created.description ?? undefined,
    status: created.status,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  };
}
