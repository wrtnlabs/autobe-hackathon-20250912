import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new risk assessment record in the
 * healthcare_platform_risk_assessments table.
 *
 * This operation creates a new risk assessment that documents a compliance,
 * operational, or technical risk review performed by or on behalf of an
 * organization or department. The record includes assessment type, status,
 * methodology, analysis period, risk findings, and any recommendations, and is
 * available post-creation for audit, tracking, and compliance review.
 *
 * Upon creation, audit-relevant metadata including creation/updating timestamps
 * and relevant actor context is captured. All inputs are required to match the
 * IHealthcarePlatformRiskAssessment.ICreate schema, and optionals are stored
 * according to nullability semantics. All fields adhere to strict typing, date
 * formatting, and immutable output conventions.
 *
 * @param props - Object containing operation parameters
 * @param props.organizationAdmin - Payload for the authenticated organization
 *   admin (OrganizationadminPayload)
 * @param props.body - Request body (IHealthcarePlatformRiskAssessment.ICreate),
 *   containing required and optional risk assessment fields
 * @returns Created risk assessment as IHealthcarePlatformRiskAssessment
 * @throws {Error} When database insert fails or schema violation occurs
 */
export async function posthealthcarePlatformOrganizationAdminRiskAssessments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformRiskAssessment.ICreate;
}): Promise<IHealthcarePlatformRiskAssessment> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_risk_assessments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        assessor_id:
          typeof props.body.assessor_id !== "undefined"
            ? props.body.assessor_id
            : null,
        department_id:
          typeof props.body.department_id !== "undefined"
            ? props.body.department_id
            : null,
        assessment_type: props.body.assessment_type,
        status: props.body.status,
        methodology: props.body.methodology,
        risk_level: props.body.risk_level,
        window_start: props.body.window_start,
        window_end: props.body.window_end,
        recommendations:
          typeof props.body.recommendations !== "undefined"
            ? props.body.recommendations
            : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    organization_id: created.organization_id,
    assessor_id: created.assessor_id === null ? undefined : created.assessor_id,
    department_id:
      created.department_id === null ? undefined : created.department_id,
    assessment_type: created.assessment_type,
    status: created.status,
    methodology: created.methodology,
    risk_level: created.risk_level,
    window_start: created.window_start,
    window_end: created.window_end,
    recommendations:
      created.recommendations === null ? undefined : created.recommendations,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at === null ? undefined : created.deleted_at,
  };
}
