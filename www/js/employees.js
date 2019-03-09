/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function () {
    "use strict";
    var client, // Connection to the Azure Mobile App backend
        store,  // Sqlite store to use for offline data sync
        syncContext, // Offline data sync context
        tableName = 'Company_Employees',
        todoItemTable; // Reference to a table endpoint on backend
    window.sUSR_ID;
    // Set useOfflineSync to true to use tables from local store.
    // Set useOfflineSync to false to use tables on the server.
    var useOfflineSync = false;

    // Add an event listener to call our initialization routine when the host is ready
    document.addEventListener('deviceready', onDeviceReady, false);

    /**
     * Event Handler, called when the host is ready
     *
     * @event
     */
    function onDeviceReady() {
        buildGrid('');
        // Create a connection reference to our Azure Mobile Apps backend 
        client = new WindowsAzure.MobileServiceClient('https://capstoneapplication.azurewebsites.net');

        if (useOfflineSync) {
            initializeStore().then(setup);
        } else {
            setup();
        }
    }

    /**
     * Set up and initialize the local store.
     */
    function initializeStore() {
        // Create the sqlite store
        store = new WindowsAzure.MobileServiceSqliteStore();

        // Define the table schema
        return store.defineTable({
            name: tableName,
            columnDefinitions: {
                cE_ID:'string',
                sCT_ID: 'string',
                cE_FirstName: 'string',
                cE_LastName: 'string',
                cE_Address1: 'string',
                cE_Address2: 'string',
                cE_City: 'string',
                cE_State: 'string',
                cE_Zip: 'string',
                deleted: 'boolean'
            }
        }).then(function () {
            // Initialize the sync context
            syncContext = client.getSyncContext();

            // Define an overly simplified push handler that discards
            // local changes whenever there is an error or conflict.
            // Note that a real world push handler will have to take action according
            // to the nature of conflict.
            syncContext.pushHandler = {
                onConflict: function (pushError) {
                    return pushError.cancelAndDiscard();
                },
                onError: function (pushError) {
                    return pushError.cancelAndDiscard();
                }
            };

            return syncContext.initialize(store);
        });
    }

    /**
     * Set up the tables, event handlers and load data from the server 
     */
    function setup() {
        // Create a table reference
        if (useOfflineSync) {
            todoItemTable = client.getSyncTable(tableName);
        } else {
            todoItemTable = client.getTable(tableName);
        }

        window.sUSR_ID = getQueryVariable('sUSR_ID');
        getItems(window.sUSR_ID);
    }
    function getItems(sUSR_ID) {
        // Execute a query for uncompleted items and process
        todoItemTable
            .where({ sCT_ID: sUSR_ID }) //deleted: false,    // Set up the query
            .read()                         // Read the results
            .then(buildGrid, handleError);
    }

    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == variable) {
                return decodeURIComponent(pair[1]);
            }
        }
        alert('Query variable %s not found', variable);
    }

    /**
 * Create a list of Todo Items
 * @param {TodoItem[]} items an array of todoitem objects
 * @returns {void}
 */
    function buildGrid(items) {
        var datastring = "[";
        if (items === '') {
            datastring = '{}';
        } else {
            for (var i = 0; i < items.length; i++) {
                datastring +=
                    '{"emplname":"' + items[i].cE_FirstName + ' ' + items[i].cE_LastName
                    + '","empladdress":"' + items[i].cE_Address1 + ' ' + items[i].cE_City + ' ' + items[i].cE_State + ' ' + items[i].cE_Zip
                    + '","empldeleted":"' + items[i].deleted
                    + '","emplid":"' + items[i].cE_ID + '"},'
            }
            datastring = datastring.slice(0, -1);
            datastring += "]";
        }        
        var data = $.parseJSON(datastring);
        var docsource = {
            datatype: 'json',
            datafields: [
                { "name": "emplname" },
                { "name": "empladdress" },
                { "name": "empldeleted" },
                { "name": "emplid" }
            ],
            localdata: data
        };
        var cellsrenderer = function (row, columnfield, value, defaulthtml, columnproperties, rowdata) {
            return '<div style="position:absolute; top:5px; left:5px;"><a href="" onclick="customNavigation(' + rowdata.emplid + ')">' + value + '</a></div>';
        }
        var dataAdapter = new $.jqx.dataAdapter(docsource);
        var maxwidth = $("#body").width();
        $("#jqxgrid").jqxGrid(
        {
            source: dataAdapter,
            width: "95%",
            autoheight: true,
            sortable: true,
            pageable: true,
            columnsresize: true,
                columns: [
                { text: '#', datafield: 'emplid', width: '3%'},
                { text: 'Empl Name',    datafield: 'emplname',      width: '27%', cellsrenderer: cellsrenderer},
                { text: 'Address',      datafield: 'empladdress',   width: '50%' },
                { text: 'Deleted',      datafield: 'empldeleted',   width: '20%' }
            ]
        });
    }


    /**
 * Handle error conditions
 * @param {Error} error the error that needs handling
 * @returns {void}
 */
    function handleError(error) {
        var text = error + (error.request ? ' - ' + error.request.status : '');
        console.error(text);
    }

    window.customNavigation = function (emplid) {
        console.log(emplid);
        window.location.href = "/employee.html?emplid=" + emplid + "&sUSR_ID=" + window.sUSR_ID;
    }

    window.navigate = function (flag) {
        if (flag) {
            jConfirm('Are you sure that you want to exit the app?', 'Confirmation Dialog', function (r) {
                if (r) {
                    window.location.href = "/index.html";
                } else {
                    //do nothing
                }
            });
        } else {
            window.location.href = "/employees.html?sUSR_ID=" + window.sUSR_ID
        }
    }
})();