import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsComplianceRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsComplianceRecords";
import { IPageIEnterpriseLmsComplianceRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsComplianceRecords";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves a paginated list of learner compliance records filtered by various
 * criteria.
 *
 * This operation excludes soft-deleted records and supports filtering by
 * compliance type, compliance status, learner ID, tenant ID, and free-text
 * search within compliance details. Only users with organization admin roles
 * should call this function.
 *
 * @param props - The request properties including the authenticated
 *   organization admin and filtering criteria.
 * @param props.organizationAdmin - The authenticated organization administrator
 *   payload.
 * @param props.body - The request body containing filter and pagination
 *   parameters.
 * @returns A paginated summary of compliance records matching the search
 *   criteria.
 * @throws {Error} If the query fails or if authorization is invalid
 *   (authorization supposed to be pre-checked).
 */
export async function patchenterpriseLmsOrganizationAdminComplianceRecords(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsComplianceRecords.IRequest;
}): Promise<IPageIEnterpriseLmsComplianceRecords.ISummary> {
  const { organizationAdmin, body } = props;

  const page: number & tags.Type<"int32"> = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit: number & tags.Type<"int32"> = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    compliance_type?: string;
    compliance_status?: string;
    learner_id?: string & tags.Format<"uuid">;
    tenant_id?: string & tags.Format<"uuid">;
    details?: { contains: string };
  } = { deleted_at: null };

  if (body.compliance_type !== undefined && body.compliance_type !== null) {
    where.compliance_type = body.compliance_type;
  }
  if (body.compliance_status !== undefined && body.compliance_status !== null) {
    where.compliance_status = body.compliance_status;
  }
  if (body.learner_id !== undefined && body.learner_id !== null) {
    where.learner_id = body.learner_id;
  }
  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    where.tenant_id = body.tenant_id;
  }
  if (body.search !== undefined && body.search !== null) {
    where.details = { contains: body.search };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_compliance_records.findMany({
      where: where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        learner_id: true,
        tenant_id: true,
        compliance_type: true,
        compliance_status: true,
        details: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_compliance_records.count({ where }),
  ]);

  const data: IEnterpriseLmsComplianceRecords.ISummary[] = results.map(
    (item) => ({
      id: item.id,
      learner_id: item.learner_id,
      tenant_id: item.tenant_id,
      compliance_type: item.compliance_type,
      compliance_status: item.compliance_status,
      details: item.details ?? undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
