import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing UI page
 *
 * This operation updates a UI page identified by pageId. It ensures the page
 * exists, validates that the new name is unique if changed, updates relevant
 * fields, and returns the updated page object.
 *
 * Authorization: Requires admin role passed in props.admin.
 *
 * @param props - Object containing admin payload, pageId, and update body
 * @returns The updated UI page object
 * @throws {Error} If the page does not exist (404 error)
 * @throws {Error} If the new name conflicts with an existing page (409 error)
 */
export async function putflexOfficeAdminPagesPageId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePage.IUpdate;
}): Promise<IFlexOfficePage> {
  const { admin, pageId, body } = props;

  // Verify page existence
  const existing = await MyGlobal.prisma.flex_office_pages.findUniqueOrThrow({
    where: { id: pageId },
  });

  // If body.name provided and different, check uniqueness
  if (body.name !== undefined && body.name !== existing.name) {
    const nameExists = await MyGlobal.prisma.flex_office_pages.findFirst({
      where: {
        name: body.name,
        NOT: { id: pageId },
        deleted_at: null,
      },
    });
    if (nameExists) {
      throw new Error(`Conflict: name ${body.name} already in use.`);
    }
  }

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Update data with optional fields
  const updated = await MyGlobal.prisma.flex_office_pages.update({
    where: { id: pageId },
    data: {
      flex_office_page_theme_id:
        body.flex_office_page_theme_id !== undefined
          ? body.flex_office_page_theme_id
          : undefined,
      name: body.name !== undefined ? body.name : undefined,
      description:
        body.description !== undefined ? body.description : undefined,
      status: body.status !== undefined ? body.status : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    flex_office_page_theme_id:
      updated.flex_office_page_theme_id === null
        ? null
        : (updated.flex_office_page_theme_id ?? undefined),
    name: updated.name,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
