import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { patientAuthorize } from "../providers/authorize/patientAuthorize";

/**
 * Parameter decorator to authenticate & authorize a patient in controller methods.
 * Adds Bearer auth to OpenAPI docs. Injects PatientPayload on success.
 */
export const PatientAuth = (): ParameterDecorator => (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
): void => {
  SwaggerCustomizer((props) => {
    props.route.security ??= [];
    props.route.security.push({ bearer: [] });
  })(target, propertyKey as string, undefined!);
  singleton.get()(target, propertyKey, parameterIndex);
};

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return patientAuthorize(request);
  })(),
);
