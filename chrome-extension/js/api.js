const YouTrackAPI = {
    url: null,
    authToken: null,
    currentUser: null,

    init(data) {
        this.url = data.youtrack_url;
        this.currentUser = data.currentUser;
        this.authToken = data.authToken;
    },

    users: {
        getCurrent: async function () {
            const fields = 'fields=id,fullName';
            const url = YouTrackAPI.url + '/api/users/me' + `?${fields}`;

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        }
    },

    issues: {
        getByIds: async function (ids) {
            const fields = 'fields=id,idReadable,summary';
            const query = `issue ID: ${ids}`;
            const url = YouTrackAPI.url + '/api/issues' + `?${fields}&query=${query}`;

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        }
    },

    workItems: {
        getById: async function (workItemId) {
            const fields = 'fields=id,created,issue(id,idReadable,summary,project(id,name)),duration(presentation,minutes),text';
            const url = YouTrackAPI.url + `/api/workItems/${workItemId}` + `?${fields}`;
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
              return await response.json();
            }
            return null;
        },
        getActive: async function () {
            const fields = 'fields=id,created,issue(id,idReadable,summary,project(id,name)),duration(presentation,minutes),text';
            const currentUserId = YouTrackAPI.currentUser.id;
            const timerId = `[timer_u${currentUserId}]`
            const url = YouTrackAPI.url + '/api/workItems' + `?${fields}` + '&author=me&query=' + timerId;
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            let activeWorkItem = null;
            if (response.ok) {
                const workItems = await response.json();
                workItems.forEach((element, index) => {
                    if (element.text !== null && element.text.includes(timerId)) {
                        activeWorkItem = element;
                        return;
                    }
                });
            }
            return activeWorkItem;
        },
        getRecent: async function (startPeriod) {
            const fields = 'fields=id,created,issue(id,idReadable,summary,updated),duration(presentation,minutes),text';
            const url = YouTrackAPI.url + '/api/workItems' + `?${fields}` + '&author=me&createdStart=' + startPeriod + '&query=sort by: created desc';
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            let workItems = [];
            if (response.ok) {
                workItems = await response.json();
            }
            return workItems;
        },
        getRecentIssues: async function () {
            const startPeriod = Date.now() - 2 * 86400 * 1000; // Get two last days.
            const workItems = await YouTrackAPI.workItems.getRecent(startPeriod);

            const uniqueWorkItemIssues = [];
            workItems.forEach((workItem) => {
                let index = uniqueWorkItemIssues.findIndex((item) => item.id === workItem.issue.id);
                if (index === -1) {
                    // If not found, push a new object with the desired properties
                    uniqueWorkItemIssues.push(workItem.issue);
                }
            });

            uniqueWorkItemIssues.sort((a, b) => b.updated - a.updated);

            return uniqueWorkItemIssues;
        },
        stopActive: async (description = '') => {
            const activeWorkItem = await YouTrackAPI.workItems.getActive();
            if (activeWorkItem === null) {
                return null;
            }

            const itemId = activeWorkItem.id;
            const issueId = activeWorkItem.issue.id;
            const url = YouTrackAPI.url + `/api/issues/${issueId}/timeTracking/workItems/${itemId}`;
            const totalTime = Date.now() - activeWorkItem.created;
            const minutes = parseInt((totalTime / 1000 / 60).toFixed());

            var workData = {
                text: description ? description.replace( /(<([^>]+)>)/ig, '') : activeWorkItem.issue.summary,
                duration: {
                    minutes: minutes < 1 ? 1 : minutes,
                },
                // worktype: {name: entry.task} // @todo: add worktype support.
            }

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'POST',
                body: JSON.stringify(workData),
            });
            if (response.ok) {
              return await response.json();
            }
            return response;
        },

        startTimer: async (issueId) => {
            const url = YouTrackAPI.url + `/api/issues/${issueId}/timeTracking/workItems`;

            const text = `(DON'T CHANGE) Timer [timer_u${YouTrackAPI.currentUser.id}] started.`;
            const workData = {
                text: text,
                duration: {
                    minutes: 1
                },
                // worktype: {name: entry.task} // @todo: add worktype support.
            }

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'POST',
                body: JSON.stringify(workData),
            });
            if (response.ok) {
              return await response.json();
            }
            return response;
        }
    }
};
