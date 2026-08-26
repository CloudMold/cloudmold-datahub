import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { DeprecationIcon } from '@app/entityV2/shared/components/styled/DeprecationIcon';
import CustomThemeProvider from '@src/CustomThemeProvider';
import { EntityType, SubResourceType } from '@src/types.generated';

describe('DeprecationPill', () => {
    const defaultProps = {
        urn: 'urn:li:dataset:123',
        subResource: null,
        subResourceType: SubResourceType.DatasetField,
        showUndeprecate: false,
        refetch: vi.fn(),
    };

    // A schema field replacement renders a router Link to its parent's columns.
    const renderPill = (deprecation: any) =>
        render(
            <MockedProvider>
                <CustomThemeProvider>
                    <MemoryRouter>
                        <DeprecationIcon {...defaultProps} deprecation={deprecation} />
                    </MemoryRouter>
                </CustomThemeProvider>
            </MockedProvider>,
        );

    it('correctly converts v2 schema field replacement path', async () => {
        renderPill({
            note: 'Deprecating this field',
            decommissionTime: null,
            deprecated: true,
            replacement: {
                urn: 'urn:li:schemaField:(urn:li:dataset:(urn:li:dataPlatform:hive,db.schema.table,PROD),[version=2.0].[key=True].parent.[type=struct].child.[type=string])',
                type: EntityType.SchemaField,
            },
        });

        const pill = screen.getByText('Deprecated');
        fireEvent.mouseEnter(pill);
        await waitFor(() => {
            expect(screen.getByText(/parent\.child/)).toBeInTheDocument();
        });
    });

    it('shows note and decommission time when both present', async () => {
        renderPill({
            note: 'This is deprecated',
            decommissionTime: 1735689600, // Jan 1, 2025
            deprecated: true,
            replacement: null,
        });

        const pill = screen.getByText('Deprecated');
        fireEvent.mouseEnter(pill);
        await waitFor(() => {
            expect(screen.getByText('This is deprecated')).toBeInTheDocument();
            expect(screen.getByText(/Scheduled to be decommissioned/)).toBeInTheDocument();
        });
    });

    it('shows "No additional details" when no details provided', async () => {
        renderPill({ note: '', decommissionTime: null, deprecated: true, replacement: null });

        const pill = screen.getByText('Deprecated');
        fireEvent.mouseEnter(pill);
        await waitFor(() => {
            expect(screen.getByText('No additional details')).toBeInTheDocument();
        });
    });
});
