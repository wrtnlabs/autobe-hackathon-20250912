import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new marketplace widget in the FlexOffice system.
 *
 * This operation is restricted to admin users who can manage the extensibility
 * marketplace. It requires a unique widget code along with name, version, and
 * an optional description.
 *
 * The function ensures the widget code does not already exist (excluding
 * soft-deleted entries).
 *
 * @param props - Object containing authenticated admin info and creation body
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.body - Widget creation data including widget_code, name,
 *   version, and optional description
 * @returns The newly created marketplace widget record with all audit
 *   timestamps
 * @throws {Error} If the widget_code already exists in the database
 */
export async function postflexOfficeAdminMarketplaceWidgets(props: {
  admin: AdminPayload;
  body: IFlexOfficeMarketplaceWidget.ICreate;
}): Promise<IFlexOfficeMarketplaceWidget> {
  const { admin, body } = props;

  const existing =
    await MyGlobal.prisma.flex_office_marketplace_widgets.findFirst({
      where: {
        widget_code: body.widget_code,
        deleted_at: null,
      },
    });

  if (existing !== null) {
    throw new Error("Widget code already exists");
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_marketplace_widgets.create({
    data: {
      id,
      widget_code: body.widget_code,
      name: body.name,
      version: body.version,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    widget_code: created.widget_code,
    name: created.name,
    version: created.version,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
