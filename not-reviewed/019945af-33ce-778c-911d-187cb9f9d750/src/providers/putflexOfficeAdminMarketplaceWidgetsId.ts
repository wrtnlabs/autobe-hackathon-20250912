import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing FlexOffice marketplace widget's details.
 *
 * Only admin users can perform this update operation. The widget is identified
 * by its UUID. Update excludes changing the 'widget_code' property as per
 * business rules.
 *
 * @param props - Object containing admin auth, widget UUID, and update data
 * @param props.admin - Authenticated admin user making the request
 * @param props.id - UUID of the marketplace widget to update
 * @param props.body - Partial update data for the widget
 * @returns The updated marketplace widget details
 * @throws {Error} When the marketplace widget with given ID does not exist
 */
export async function putflexOfficeAdminMarketplaceWidgetsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeMarketplaceWidget.IUpdate;
}): Promise<IFlexOfficeMarketplaceWidget> {
  const { admin, id, body } = props;

  // Verify the marketplace widget exists
  const existing =
    await MyGlobal.prisma.flex_office_marketplace_widgets.findUnique({
      where: { id },
    });
  if (!existing) throw new Error("Marketplace widget not found");

  // Set the updated_at timestamp
  const updatedAt = toISOStringSafe(new Date());

  // Prepare update payload, excluding widget_code as it must remain unchanged
  const data = {
    name: body.name ?? undefined,
    version: body.version ?? undefined,
    description: body.description ?? undefined,
    deleted_at: body.deleted_at ?? undefined,
    updated_at: updatedAt,
  };

  // Update the marketplace widget in the database
  const updated = await MyGlobal.prisma.flex_office_marketplace_widgets.update({
    where: { id },
    data,
  });

  // Return the updated widget with all Date fields as ISO strings
  return {
    id: updated.id,
    widget_code: updated.widget_code,
    name: updated.name,
    version: updated.version,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
