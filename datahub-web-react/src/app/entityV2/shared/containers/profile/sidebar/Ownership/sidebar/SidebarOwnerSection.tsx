import { message } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components/macro';

import { useEntityData, useMutationUrn, useRefetch } from '@app/entity/shared/EntityContext';
// import { ExpandedOwner } from '../../../../../components/styled/ExpandedOwner/ExpandedOwner';
import { EMPTY_MESSAGES } from '@app/entityV2/shared/constants';
import EmptySectionText from '@app/entityV2/shared/containers/profile/sidebar/EmptySectionText';
import { EditOwnersModal } from '@app/entityV2/shared/containers/profile/sidebar/Ownership/EditOwnersModal';
import { getOwnershipTypeName } from '@app/entityV2/shared/containers/profile/sidebar/Ownership/ownershipUtils';
import { OwnershipTypeSection } from '@app/entityV2/shared/containers/profile/sidebar/Ownership/sidebar/OwnershipTypeSection';
import { SidebarSection } from '@app/entityV2/shared/containers/profile/sidebar/SidebarSection';
import { ENTITY_PROFILE_OWNERS_ID } from '@app/onboarding/config/EntityProfileOnboardingConfig';
import { Button } from '@components';

import { useBatchAddOwnersMutation } from '@graphql/mutations.generated';
import { Owner, OwnershipType, OwnershipTypeEntity, OwnerEntityType } from '@types';

// Interface for pending owner approval
interface PendingOwnerApproval {
    ownerUrn: string;
    ownerEntityType: OwnerEntityType;
    ownershipTypeUrn: string;
    displayName: string;
}

// Styled components for approval workflow
const ApprovalWorkflowContainer = styled.div`
    margin-top: 16px;
    padding: 16px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background-color: #f9f9f9;
`;

const ApprovalHeader = styled.div`
    font-weight: 600;
    margin-bottom: 12px;
    color: #1d4ed8;
`;

const ApprovalMessage = styled.div`
    margin-bottom: 12px;
    font-size: 14px;
    color: #666;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
`;

const Content = styled.div`
    display: flex;
    align-items: center;
    justify-content: start;
    flex-wrap: wrap;
`;

const OwnershipSections = styled.div`
    display: flex;
    align-items: start;
    justify-content: start;
    flex-wrap: wrap;
    max-width: 100%;
`;

interface Props {
    properties?: any;
    readOnly?: boolean;
}

export const SidebarOwnerSection = ({ properties, readOnly }: Props) => {
    const { entityType, entityData } = useEntityData();
    const mutationUrn = useMutationUrn();

    const refetch = useRefetch();
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
    const [pendingApprovals, setPendingApprovals] = useState<PendingOwnerApproval[]>([]);
    const [isProcessingApproval, setIsProcessingApproval] = useState(false);

    // Mutation for adding owners
    const [batchAddOwnersMutation] = useBatchAddOwnersMutation();

    const ownersEmpty = !entityData?.ownership?.owners?.length;
    const ownershipTypesMap: Map<string, OwnershipTypeEntity> = new Map();
    const ownersByTypeMap: Map<string, Owner[]> = new Map();
    entityData?.ownership?.owners?.forEach((owner) => {
        const ownershipType = owner?.ownershipType;
        const ownershipTypeName = getOwnershipTypeName(ownershipType);
        // If ownership type is not in the map, add it
        if (ownershipType && !ownershipTypesMap.has(ownershipTypeName)) {
            ownershipTypesMap.set(ownershipTypeName, ownershipType);
        }
        if (!ownersByTypeMap.has(ownershipTypeName)) {
            ownersByTypeMap.set(ownershipTypeName, []);
        }
        ownersByTypeMap.get(ownershipTypeName)?.push(owner);
    });
    // Sort ownership types by name alphabetically
    const ownershipTypeNames = Array.from(ownershipTypesMap.keys()).sort();

    let defaultOwnerTypeUrn = 'urn:li:ownershipType:__system__technical_owner';
    switch (properties?.defaultOwnerType) {
        case OwnershipType.TechnicalOwner:
            defaultOwnerTypeUrn = 'urn:li:ownershipType:__system__technical_owner';
            break;
        case OwnershipType.BusinessOwner:
            defaultOwnerTypeUrn = 'urn:li:ownershipType:__system__business_owner';
            break;
        case OwnershipType.DataSteward:
            defaultOwnerTypeUrn = 'urn:li:ownershipType:__system__data_steward';
            break;
        default:
            break;
    }

    const canEditOwners = !!entityData?.privileges?.canEditOwners;

    // Handle approval request - simulates sending owners for approval
    const handleApprovalRequest = (selectedOwners: any[]) => {
        const pendingApprovals: PendingOwnerApproval[] = selectedOwners.map((owner) => ({
            ownerUrn: owner.ownerUrn,
            ownerEntityType: owner.ownerEntityType,
            ownershipTypeUrn: owner.ownershipTypeUrn,
            displayName: owner.displayName || owner.ownerUrn.split(':').pop() || 'Unknown User',
        }));

        setPendingApprovals(pendingApprovals);
        setShowApprovalWorkflow(true);
        setShowApprovalModal(false); // Close the modal
        message.info('Owner approval request submitted! Waiting for approval.');
    };

    // Handle opening approval modal
    const handleOpenApprovalModal = () => {
        setShowApprovalModal(true);
    };

    // Handle approval decision
    const handleApprovalDecision = async (approved: boolean) => {
        if (approved) {
            setIsProcessingApproval(true);
            try {
                // Prepare the input for the batch add owners mutation
                const addOwnerInput = {
                    owners: pendingApprovals.map((approval) => ({
                        ownerUrn: approval.ownerUrn,
                        ownerEntityType: approval.ownerEntityType,
                        ownershipTypeUrn: approval.ownershipTypeUrn,
                    })),
                    resources: [
                        {
                            resourceUrn: mutationUrn,
                        },
                    ],
                };

                // Execute the mutation to add owners
                await batchAddOwnersMutation({
                    variables: {
                        input: addOwnerInput,
                    },
                });

                message.success('Owner approval request approved! Owners have been added.');
                
                // Refetch the data to update the UI
                await refetch();
            } catch (error) {
                console.error('Error adding owners:', error);
                message.error('Failed to add owners. Please try again.');
            } finally {
                setIsProcessingApproval(false);
            }
        } else {
            message.info('Owner approval request rejected.');
        }
        
        // Clear the approval workflow
        setPendingApprovals([]);
        setShowApprovalWorkflow(false);
    };

    return (
        <div id={ENTITY_PROFILE_OWNERS_ID}>
            <SidebarSection
                title="Owners"
                content={
                    <Content>
                        <OwnershipSections>
                            {ownershipTypeNames.map((ownershipTypeName) => {
                                const ownershipType = ownershipTypesMap.get(ownershipTypeName) as OwnershipTypeEntity;
                                const owners = ownersByTypeMap.get(ownershipTypeName) as Owner[];
                                return (
                                    <OwnershipTypeSection
                                        key={ownershipTypeName}
                                        ownershipType={ownershipType}
                                        owners={owners}
                                        readOnly={readOnly}
                                    />
                                );
                            })}
                        </OwnershipSections>
                        {ownersEmpty && <EmptySectionText message={EMPTY_MESSAGES.owners.title} />}
                    </Content>
                }
                extra={
                    !readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                                handleOpenApprovalModal();
                                event.stopPropagation();
                            }}
                            disabled={!canEditOwners}
                        >
                            Request Approval
                        </Button>
                    )
                }
            />
            
            {/* Approval Request Modal */}
            {showApprovalModal && (
                <EditOwnersModal
                    urns={[mutationUrn]}
                    defaultOwnerType={defaultOwnerTypeUrn}
                    hideOwnerType={properties?.hideOwnerType || false}
                    entityType={entityType}
                    refetch={refetch}
                    title="Request Owner Approval"
                    onOkOverride={(selectedOwners) => {
                        // Transform the selected owners format to match our approval workflow
                        const ownersForApproval = selectedOwners.map((owner) => ({
                            ownerUrn: owner.value.ownerUrn,
                            ownerEntityType: owner.value.ownerEntityType,
                            ownershipTypeUrn: defaultOwnerTypeUrn,
                            displayName: typeof owner.label === 'string' ? owner.label : 'Unknown User',
                        }));
                        handleApprovalRequest(ownersForApproval);
                    }}
                    onCloseModal={() => {
                        setShowApprovalModal(false);
                    }}
                />
            )}
            
            {/* Approval Workflow UI */}
            {showApprovalWorkflow && pendingApprovals.length > 0 && (
                <ApprovalWorkflowContainer>
                    <ApprovalHeader>Owner Approval Request</ApprovalHeader>
                    <ApprovalMessage>
                        The following owners are pending approval:
                    </ApprovalMessage>
                    <div style={{ marginBottom: '12px' }}>
                        {pendingApprovals.map((approval, index) => (
                            <div key={index} style={{ padding: '4px 0', fontSize: '14px' }}>
                                • {approval.displayName} ({approval.ownerEntityType})
                            </div>
                        ))}
                    </div>
                    <ButtonGroup>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprovalDecision(false)}
                            disabled={isProcessingApproval}
                        >
                            Reject
                        </Button>
                        <Button
                            variant="filled"
                            color="violet"
                            size="sm"
                            onClick={() => handleApprovalDecision(true)}
                            disabled={isProcessingApproval}
                            isLoading={isProcessingApproval}
                        >
                            {isProcessingApproval ? 'Adding Owners...' : 'Approve'}
                        </Button>
                    </ButtonGroup>
                </ApprovalWorkflowContainer>
            )}
        </div>
    );
};
