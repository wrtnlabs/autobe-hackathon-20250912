import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new UI page in FlexOffice with specified properties such as name,
 * description, status, and optional theme reference.
 *
 * This operation stores the new page record in the flex_office_pages table,
 * supporting versioning, soft deletion, and lifecycle management.
 *
 * Access control is enforced via the admin parameter, guaranteeing that only
 * authorized admins can perform this operation.
 *
 * The function validates the uniqueness of the page name to avoid duplication
 * conflicts. It also verifies that the referenced theme exists, if a theme ID
 * is provided.
 *
 * @param props - Object containing the admin performing the operation and the
 *   page creation data
 * @param props.admin - Authenticated admin user making the request
 * @param props.body - Page creation input data conforming to
 *   IFlexOfficePage.ICreate
 * @returns The newly created UI page record with all fields populated
 * @throws {Error} When the page name already exists
 * @throws {Error} When the specified theme ID does not exist
 */
export async function postflexOfficeAdminPages(props: {
  admin: AdminPayload;
  body: IFlexOfficePage.ICreate;
}): Promise<IFlexOfficePage> {
  const { admin, body } = props;

  // Check name uniqueness (only active pages)
  const existingPage = await MyGlobal.prisma.flex_office_pages.findFirst({
    where: {
      name: body.name,
      deleted_at: null,
    },
  });
  if (existingPage !== null) {
    throw new Error(`Page name '${body.name}' already exists.`);
  }

  // Validate theme existence if theme id provided
  if (
    body.flex_office_page_theme_id !== undefined &&
    body.flex_office_page_theme_id !== null
  ) {
    const theme = await MyGlobal.prisma.flex_office_page_themes.findFirst({
      where: {
        id: body.flex_office_page_theme_id,
        deleted_at: null,
      },
    });
    if (!theme) {
      throw new Error(
        `Theme with id '${body.flex_office_page_theme_id}' does not exist.`,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.flex_office_pages.create({
    data: {
      id: id,
      flex_office_page_theme_id: body.flex_office_page_theme_id ?? null,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    flex_office_page_theme_id: created.flex_office_page_theme_id ?? null,
    name: created.name,
    description: created.description ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
