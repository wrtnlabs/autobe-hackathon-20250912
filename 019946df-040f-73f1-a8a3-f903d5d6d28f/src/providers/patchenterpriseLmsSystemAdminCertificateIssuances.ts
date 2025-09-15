import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import { IPageIEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertificateIssuance";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve paginated certificate issuance summaries.
 *
 * This operation filters certificate issuance records based on provided
 * criteria such as learner ID, certification ID, status, business status, issue
 * date, and expiration date ranges. It is exclusively accessible to system
 * administrators.
 *
 * @param props - Object containing systemAdmin payload and request filter body
 * @param props.systemAdmin - Authenticated system administrator making the
 *   request
 * @param props.body - Filter criteria for searching certificate issuances
 * @returns Paginated summary list of certificate issuance records
 * @throws {Error} When any unexpected error occurs during database access
 */
export async function patchenterpriseLmsSystemAdminCertificateIssuances(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsCertificateIssuance.IRequest;
}): Promise<IPageIEnterpriseLmsCertificateIssuance.ISummary> {
  const { systemAdmin, body } = props;

  // Default pagination parameters
  const page = 0;
  const limit = 10;

  // Compose where clause with filtering
  const whereClause = {
    deleted_at: null,
    ...(body.learner_id !== undefined &&
      body.learner_id !== null && { learner_id: body.learner_id }),
    ...(body.certification_id !== undefined &&
      body.certification_id !== null && {
        certification_id: body.certification_id,
      }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...((body.issue_date_from !== undefined && body.issue_date_from !== null) ||
    (body.issue_date_to !== undefined && body.issue_date_to !== null)
      ? {
          issue_date: {
            ...(body.issue_date_from !== undefined &&
            body.issue_date_from !== null
              ? { gte: body.issue_date_from }
              : {}),
            ...(body.issue_date_to !== undefined && body.issue_date_to !== null
              ? { lte: body.issue_date_to }
              : {}),
          },
        }
      : {}),
    ...((body.expiration_date_from !== undefined &&
      body.expiration_date_from !== null) ||
    (body.expiration_date_to !== undefined && body.expiration_date_to !== null)
      ? {
          expiration_date: {
            ...(body.expiration_date_from !== undefined &&
            body.expiration_date_from !== null
              ? { gte: body.expiration_date_from }
              : {}),
            ...(body.expiration_date_to !== undefined &&
            body.expiration_date_to !== null
              ? { lte: body.expiration_date_to }
              : {}),
          },
        }
      : {}),
  };

  // Execute queries in parallel
  const [total, records] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_certificate_issuances.count({
      where: whereClause,
    }),
    MyGlobal.prisma.enterprise_lms_certificate_issuances.findMany({
      where: whereClause,
      orderBy: { issue_date: "desc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        learner_id: true,
        certification_id: true,
        issue_date: true,
        expiration_date: true,
        status: true,
        business_status: true,
      },
    }),
  ]);

  // Map results to API response DTO with correct date conversions
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      learner_id: r.learner_id,
      certification_id: r.certification_id,
      issue_date: toISOStringSafe(r.issue_date),
      expiration_date: r.expiration_date
        ? toISOStringSafe(r.expiration_date)
        : null,
      status: r.status,
      business_status: r.business_status ?? null,
    })),
  };
}
