import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete an analytics report.
 *
 * This operation removes the specified analytics report record from the
 * database. Authorization is assumed to be handled externally by the presence
 * of a systemAdmin payload.
 *
 * @param props - Object containing systemAdmin payload and the
 *   analyticsReportId to delete
 * @param props.systemAdmin - The authenticated systemAdmin making the request
 * @param props.analyticsReportId - The UUID of the analytics report to delete
 * @throws {Error} Throws if the analytics report does not exist
 */
export async function deleteenterpriseLmsSystemAdminAnalyticsReportsAnalyticsReportId(props: {
  systemAdmin: SystemadminPayload;
  analyticsReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, analyticsReportId } = props;

  // Ensure the analytics report exists
  await MyGlobal.prisma.enterprise_lms_analytics_reports.findUniqueOrThrow({
    where: { id: analyticsReportId },
  });

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_analytics_reports.delete({
    where: { id: analyticsReportId },
  });
}
