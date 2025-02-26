/*
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with This program; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from "cockpit";

import {
    gatherRequests,
    getAllDiskSelection,
    getDeviceData,
    getDevices,
    getDiskFreeSpace,
    getDiskTotalSpace,
    getFormatData,
    getPartitioningMethod,
    getUsableDisks,
} from "../apis/storage.js";

export const getDevicesAction = () => {
    return async (dispatch) => {
        const devices = await getDevices();
        const devicesData = await Promise.all(devices[0].map(async (device) => {
            let devData = await getDeviceData({ disk: device });
            devData = devData[0];

            const free = await getDiskFreeSpace({ diskNames: [device] });
            // extend it with variants to keep the format consistent
            devData.free = cockpit.variant(String, free);

            const total = await getDiskTotalSpace({ diskNames: [device] });
            devData.total = cockpit.variant(String, total);

            const formatData = await getFormatData({ diskName: device });
            devData.formatData = formatData;

            const deviceData = { [device]: devData };

            return deviceData;
        }));

        return dispatch({
            type: "GET_DEVICES_DATA",
            payload: { devices: devicesData.reduce((acc, curr) => ({ ...acc, ...curr }), {}) }
        });
    };
};

export const getDiskSelectionAction = () => {
    return async (dispatch) => {
        const usableDisks = await getUsableDisks();
        const diskSelection = await getAllDiskSelection();

        return dispatch({
            type: "GET_DISK_SELECTION",
            payload: {
                diskSelection: {
                    ignoredDisks: diskSelection[0].IgnoredDisks.v,
                    selectedDisks: diskSelection[0].SelectedDisks.v,
                    usableDisks: usableDisks[0],
                }
            },
        });
    };
};

export const getPartitioningDataAction = ({ requests, partitioning }) => {
    return async (dispatch) => {
        const props = { path: partitioning };
        const convertRequests = reqs => reqs.map(request => Object.entries(request).reduce((acc, [key, value]) => ({ ...acc, [key]: value.v }), {}));

        if (!requests) {
            props.method = await getPartitioningMethod({ partitioning });
            if (props.method === "MANUAL") {
                const reqs = await gatherRequests({ partitioning });

                props.requests = convertRequests(reqs[0]);
            }
        } else {
            props.requests = convertRequests(requests);
        }

        return dispatch({
            type: "GET_PARTITIONING_DATA",
            payload: { path: partitioning, partitioningData: props }
        });
    };
};
