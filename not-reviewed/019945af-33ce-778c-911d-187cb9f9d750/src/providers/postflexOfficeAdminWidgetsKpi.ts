import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a KPI widget.
 *
 * This endpoint allows an authenticated admin user to create a new KPI widget
 * linked to a UI widget. The KPI widget configuration must be valid JSON.
 *
 * @param props - Object containing admin authentication and KPI widget data
 * @param props.admin - The authenticated admin user creating the KPI widget
 * @param props.body - The body containing flex_office_widget_id and config_json
 * @returns The newly created KPI widget record with timestamps
 * @throws {Error} When config_json is not a valid JSON string
 */
export async function postflexOfficeAdminWidgetsKpi(props: {
  admin: AdminPayload;
  body: IFlexOfficeKpiWidget.ICreate;
}): Promise<IFlexOfficeKpiWidget> {
  const { admin, body } = props;

  // Validate that config_json is valid JSON
  try {
    JSON.parse(body.config_json);
  } catch {
    throw new Error("Invalid JSON format in config_json");
  }

  // Generate new UUID for the KPI widget id
  const id = v4() as string & tags.Format<"uuid">;

  // Get current ISO timestamp
  const now = toISOStringSafe(new Date());

  // Create KPI widget record in database
  const created = await MyGlobal.prisma.flex_office_kpi_widgets.create({
    data: {
      id: id,
      flex_office_widget_id: body.flex_office_widget_id,
      config_json: body.config_json,
      created_at: now,
      updated_at: now,
    },
  });

  // Return with all date fields converted
  return {
    id: created.id as string & tags.Format<"uuid">,
    flex_office_widget_id: created.flex_office_widget_id as string &
      tags.Format<"uuid">,
    config_json: created.config_json,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
