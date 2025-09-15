import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get marketplace widget details by ID
 *
 * Retrieves details of a specific marketplace widget identified by the provided
 * UUID. Only users with admin role can perform this operation. Returns full
 * widget entity including widget_code, name, version, description, created_at,
 * updated_at, and soft delete timestamp.
 *
 * @param props - Object containing admin payload and widget ID
 * @param props.admin - Authenticated admin user performing the operation
 * @param props.id - UUID of the marketplace widget to retrieve
 * @returns Promise resolving to the detailed marketplace widget
 * @throws Error if widget not found
 */
export async function getflexOfficeAdminMarketplaceWidgetsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeMarketplaceWidget> {
  const { admin, id } = props;

  const widget =
    await MyGlobal.prisma.flex_office_marketplace_widgets.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: widget.id,
    widget_code: widget.widget_code,
    name: widget.name,
    version: widget.version,
    description: widget.description ?? null,
    created_at: toISOStringSafe(widget.created_at),
    updated_at: toISOStringSafe(widget.updated_at),
    deleted_at: widget.deleted_at ? toISOStringSafe(widget.deleted_at) : null,
  };
}
