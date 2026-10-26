"use server";

// Barrel das Server Actions: aplica o runAction (contrato { ok, data } | { ok, error }) sobre os `*Impl`
// de cada domínio em ./actions/*. A lógica mora nos domínios; aqui só o embrulho, como já era para o crm.
// Os componentes importam de "@/lib/actions" — estes nomes públicos não mudam.

import { runAction } from "./action-result";
import { getCurrentUserId as readCurrentUserId } from "./auth";
export async function getCurrentUserId() { return readCurrentUserId(); }

import { getMarketplaceData as readMarketplaceData } from "./queries/marketplace";
import type { MarketplaceQuery } from "./marketplace-query";
async function getMarketplaceDataImpl(input: MarketplaceQuery = {}) { return readMarketplaceData(input); }

import * as crmActions from "./actions/crm";
async function createLeadImpl(...args: Parameters<typeof crmActions.createLead>) { return crmActions.createLead(...args); }
async function importLeadsCsvImpl(...args: Parameters<typeof crmActions.importLeadsCsv>) { return crmActions.importLeadsCsv(...args); }
async function updateLeadImpl(...args: Parameters<typeof crmActions.updateLead>) { return crmActions.updateLead(...args); }
async function updateLeadStageImpl(...args: Parameters<typeof crmActions.updateLeadStage>) { return crmActions.updateLeadStage(...args); }
async function addLeadActivityImpl(...args: Parameters<typeof crmActions.addLeadActivity>) { return crmActions.addLeadActivity(...args); }
async function completeLeadFollowUpImpl(...args: Parameters<typeof crmActions.completeLeadFollowUp>) { return crmActions.completeLeadFollowUp(...args); }

import { updateUserStatusImpl, setAdminViewAccessImpl, exemptUserFromBillingImpl, confirmPixSubscriptionPaymentImpl, refundPixSubscriptionPaymentImpl } from "./actions/admin";
import { createPropertyImpl, createBuyerProfileImpl } from "./actions/property";
import { createDvpCertificateImpl } from "./actions/dvp";
import { updatePartnershipStatusImpl, respondToPartnershipSplitImpl, revisePartnershipCommissionImpl } from "./actions/partnership";
import { markNotificationAsReadImpl, markAllNotificationsAsReadImpl } from "./actions/notifications";
import { submitPilotFeedbackImpl, updatePilotFeedbackStatusImpl } from "./actions/feedback";
import { registerUserWithPixImpl, loginUserImpl, logoutUserImpl, validateCreciFormatImpl } from "./actions/account";
import { getMySubscriptionImpl, requestSubscriptionRenewalImpl } from "./actions/my-subscription";
import { getBrokerAssistantStatusImpl, askBrokerAssistantImpl } from "./actions/assistant";
import { saveNegotiationDocumentsImpl, saveMyDocumentationTemplateImpl, getMyDocumentationTemplateImpl } from "./actions/documents";

// Cada ação devolve { ok, data } ou { ok, error }: a mensagem esperada chega à tela também em produção.
export async function getMarketplaceData(...args: Parameters<typeof getMarketplaceDataImpl>) { return runAction(() => getMarketplaceDataImpl(...args)); }
export async function createLead(...args: Parameters<typeof createLeadImpl>) { return runAction(() => createLeadImpl(...args)); }
export async function importLeadsCsv(...args: Parameters<typeof importLeadsCsvImpl>) { return runAction(() => importLeadsCsvImpl(...args)); }
export async function updateLead(...args: Parameters<typeof updateLeadImpl>) { return runAction(() => updateLeadImpl(...args)); }
export async function updateLeadStage(...args: Parameters<typeof updateLeadStageImpl>) { return runAction(() => updateLeadStageImpl(...args)); }
export async function addLeadActivity(...args: Parameters<typeof addLeadActivityImpl>) { return runAction(() => addLeadActivityImpl(...args)); }
export async function completeLeadFollowUp(...args: Parameters<typeof completeLeadFollowUpImpl>) { return runAction(() => completeLeadFollowUpImpl(...args)); }
export async function updateUserStatus(...args: Parameters<typeof updateUserStatusImpl>) { return runAction(() => updateUserStatusImpl(...args)); }
export async function confirmPixSubscriptionPayment(...args: Parameters<typeof confirmPixSubscriptionPaymentImpl>) { return runAction(() => confirmPixSubscriptionPaymentImpl(...args)); }
export async function exemptUserFromBilling(...args: Parameters<typeof exemptUserFromBillingImpl>) { return runAction(() => exemptUserFromBillingImpl(...args)); }
export async function setAdminViewAccess(...args: Parameters<typeof setAdminViewAccessImpl>) { return runAction(() => setAdminViewAccessImpl(...args)); }
export async function refundPixSubscriptionPayment(...args: Parameters<typeof refundPixSubscriptionPaymentImpl>) { return runAction(() => refundPixSubscriptionPaymentImpl(...args)); }
export async function createProperty(...args: Parameters<typeof createPropertyImpl>) { return runAction(() => createPropertyImpl(...args)); }
export async function createBuyerProfile(...args: Parameters<typeof createBuyerProfileImpl>) { return runAction(() => createBuyerProfileImpl(...args)); }
export async function createDvpCertificate(...args: Parameters<typeof createDvpCertificateImpl>) { return runAction(() => createDvpCertificateImpl(...args)); }
export async function updatePartnershipStatus(...args: Parameters<typeof updatePartnershipStatusImpl>) { return runAction(() => updatePartnershipStatusImpl(...args)); }
export async function respondToPartnershipSplit(...args: Parameters<typeof respondToPartnershipSplitImpl>) { return runAction(() => respondToPartnershipSplitImpl(...args)); }
export async function revisePartnershipCommission(...args: Parameters<typeof revisePartnershipCommissionImpl>) { return runAction(() => revisePartnershipCommissionImpl(...args)); }
export async function markNotificationAsRead(...args: Parameters<typeof markNotificationAsReadImpl>) { return runAction(() => markNotificationAsReadImpl(...args)); }
export async function markAllNotificationsAsRead(...args: Parameters<typeof markAllNotificationsAsReadImpl>) { return runAction(() => markAllNotificationsAsReadImpl(...args)); }
export async function submitPilotFeedback(...args: Parameters<typeof submitPilotFeedbackImpl>) { return runAction(() => submitPilotFeedbackImpl(...args)); }
export async function updatePilotFeedbackStatus(...args: Parameters<typeof updatePilotFeedbackStatusImpl>) { return runAction(() => updatePilotFeedbackStatusImpl(...args)); }
export async function validateCreciFormat(...args: Parameters<typeof validateCreciFormatImpl>) { return runAction(() => validateCreciFormatImpl(...args)); }
export async function registerUserWithPix(...args: Parameters<typeof registerUserWithPixImpl>) { return runAction(() => registerUserWithPixImpl(...args)); }
export async function loginUser(...args: Parameters<typeof loginUserImpl>) { return runAction(() => loginUserImpl(...args)); }
export async function logoutUser(...args: Parameters<typeof logoutUserImpl>) { return runAction(() => logoutUserImpl(...args)); }
export async function getMySubscription(...args: Parameters<typeof getMySubscriptionImpl>) { return runAction(() => getMySubscriptionImpl(...args)); }
export async function requestSubscriptionRenewal(...args: Parameters<typeof requestSubscriptionRenewalImpl>) { return runAction(() => requestSubscriptionRenewalImpl(...args)); }
export async function getBrokerAssistantStatus(...args: Parameters<typeof getBrokerAssistantStatusImpl>) { return runAction(() => getBrokerAssistantStatusImpl(...args)); }
export async function askBrokerAssistant(...args: Parameters<typeof askBrokerAssistantImpl>) { return runAction(() => askBrokerAssistantImpl(...args)); }
export async function saveNegotiationDocuments(...args: Parameters<typeof saveNegotiationDocumentsImpl>) { return runAction(() => saveNegotiationDocumentsImpl(...args)); }
export async function saveMyDocumentationTemplate(...args: Parameters<typeof saveMyDocumentationTemplateImpl>) { return runAction(() => saveMyDocumentationTemplateImpl(...args)); }
export async function getMyDocumentationTemplate(...args: Parameters<typeof getMyDocumentationTemplateImpl>) { return runAction(() => getMyDocumentationTemplateImpl(...args)); }
