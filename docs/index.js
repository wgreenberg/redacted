var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import init, { init_panic_hook, GameState } from './pkg/redacted_rs.js';
var Tab;
(function (Tab) {
    Tab[Tab["Emails"] = 0] = "Emails";
    Tab[Tab["Documents"] = 1] = "Documents";
})(Tab || (Tab = {}));
var UiEventKind;
(function (UiEventKind) {
    UiEventKind[UiEventKind["AttachmentNotificationClicked"] = 0] = "AttachmentNotificationClicked";
    UiEventKind[UiEventKind["EmailNotificationClicked"] = 1] = "EmailNotificationClicked";
    UiEventKind[UiEventKind["DocumentListItemClicked"] = 2] = "DocumentListItemClicked";
    UiEventKind[UiEventKind["EmailListItemClicked"] = 3] = "EmailListItemClicked";
    UiEventKind[UiEventKind["FoiaSubmitted"] = 4] = "FoiaSubmitted";
    UiEventKind[UiEventKind["TabClicked"] = 5] = "TabClicked";
})(UiEventKind || (UiEventKind = {}));
;
class GameManager {
    constructor(gameState, gameView) {
        this.gameState = gameState;
        this.gameView = gameView;
        this.docs = [];
        this.emails = [];
        this.notificationEmails = [];
        this.notificationAttachments = [];
    }
    setup() {
        this.setActiveTab(Tab.Emails);
        this.checkForEvents();
        this.gameView.setEventHandler(e => {
            console.log(UiEventKind[e.kind], e);
            if (e.kind === UiEventKind.TabClicked) {
                this.setActiveTab(e.tab);
            }
            else if (e.kind === UiEventKind.FoiaSubmitted) {
                this.submitFoiaQuery(e.input, e.year);
            }
            else if (e.kind === UiEventKind.DocumentListItemClicked) {
                this.gameView.setActiveDocument(e.index);
                this.gameView.showDocumentContents(this.docs[e.index]);
            }
            else if (e.kind === UiEventKind.AttachmentNotificationClicked) {
                const doc = this.notificationAttachments[e.index];
                const index = 0; // TODO sort docs correctly
                this.docs.splice(index, 0, doc);
                this.setActiveTab(Tab.Documents);
                this.gameView.removeAttachmentNotification(e.index);
                this.gameView.insertDocument(doc, index);
            }
            else if (e.kind === UiEventKind.EmailNotificationClicked) {
                const email = this.notificationEmails[e.index];
                this.emails.push(email);
                this.setActiveTab(Tab.Emails);
                this.gameView.removeEmailNotification(e.index);
                this.gameView.appendEmail(email);
            }
            else if (e.kind === UiEventKind.EmailListItemClicked) {
                this.gameView.setActiveEmail(e.index);
                this.gameView.showEmailContents(this.emails[e.index]);
            }
        });
    }
    submitFoiaQuery(input, year) {
        const result = this.gameState.submit_query(input, year);
        this.createEmailNotification(result.email);
        result.docs.map(doc => {
            this.createAttachmentNotification(doc);
        });
    }
    createAttachmentNotification(doc) {
        const index = this.notificationAttachments.push(doc) - 1;
        this.gameView.appendAttachmentNotification(index);
    }
    createEmailNotification(email) {
        const index = this.notificationEmails.push(email) - 1;
        this.gameView.appendEmailNotification(index);
    }
    setActiveTab(target) {
        this.activeTab = target;
        this.gameView.setActiveTab(target);
    }
    checkForEvents() {
        this.gameState.drain_events().forEach((event) => {
            event.emails.forEach(email => {
                this.createEmailNotification(email);
            });
        });
    }
}
class GameView {
    constructor() {
        this.sidebarTabs = [document.getElementById('sidebar-tab-emails'), document.getElementById('sidebar-tab-documents')];
        this.sidebarEmailList = document.getElementById('sidebar-list-emails');
        this.sidebarDocList = document.getElementById('sidebar-list-documents');
        this.contentEmail = document.getElementById('content-container-email');
        this.contentDoc = document.getElementById('content-container-document');
        this.foiaForm = document.getElementById('foia-form');
        this.notificationsList = document.getElementById('notifications-list');
        this.hookupEvents();
    }
    setEventHandler(handler) {
        this.eventHandler = handler;
    }
    hookupEvents() {
        this.foiaForm.addEventListener('submit', e => {
            e.preventDefault();
            const input = document.getElementById('foia-input');
            const year = document.getElementById('foia-year');
            this.emit({ kind: UiEventKind.FoiaSubmitted, input: input.value, year: parseInt(year.value) });
        });
        this.sidebarDocList.addEventListener('click', e => {
            const index = Array.prototype.indexOf.call(this.sidebarDocList.children, e.target);
            this.emit({ kind: UiEventKind.DocumentListItemClicked, index: index });
        });
        this.sidebarEmailList.addEventListener('click', e => {
            const index = Array.prototype.indexOf.call(this.sidebarEmailList.children, e.target);
            this.emit({ kind: UiEventKind.EmailListItemClicked, index: index });
        });
        this.sidebarTabs[0].addEventListener('click', e => {
            this.emit({ kind: UiEventKind.TabClicked, tab: Tab.Emails });
        });
        this.sidebarTabs[1].addEventListener('click', e => {
            this.emit({ kind: UiEventKind.TabClicked, tab: Tab.Documents });
        });
        this.notificationsList.addEventListener('click', e => {
            if (e.target instanceof HTMLElement) {
                const index = parseInt(e.target.dataset.index);
                if (e.target.classList.contains('notification-email')) {
                    this.emit({ kind: UiEventKind.EmailNotificationClicked, index: index });
                }
                else if (e.target.classList.contains('notification-attachment')) {
                    this.emit({ kind: UiEventKind.AttachmentNotificationClicked, index: index });
                }
            }
        });
    }
    setActiveListMember(list, index) {
        Array.prototype.forEach.call(list, (child, i) => {
            if (index === i) {
                this.ensureClass(child, 'selected');
                child.classList.remove('unread');
            }
            else {
                child.classList.remove('selected');
            }
        });
    }
    setActiveEmail(index) {
        this.setActiveListMember(this.sidebarEmailList.children, index);
    }
    setActiveDocument(index) {
        this.setActiveListMember(this.sidebarDocList.children, index);
    }
    emit(event) {
        if (this.eventHandler) {
            this.eventHandler(event);
        }
    }
    appendEmailNotification(index) {
        const node = document.createElement('div');
        const icon = document.createElement('img');
        node.dataset.index = index.toString();
        node.setAttribute('class', 'notification-email');
        node.appendChild(icon);
        this.notificationsList.appendChild(node);
    }
    appendAttachmentNotification(index) {
        const node = document.createElement('div');
        node.dataset.index = index.toString();
        const icon = document.createElement('img');
        node.setAttribute('class', 'notification-attachment');
        node.appendChild(icon);
        this.notificationsList.appendChild(node);
    }
    removeEmailNotification(index) {
        this.notificationsList.querySelector(`.notification-email[data-index="${index}"]`).remove();
    }
    removeAttachmentNotification(index) {
        this.notificationsList.querySelector(`.notification-attachment[data-index="${index}"]`).remove();
    }
    appendEmail(email) {
        this.sidebarEmailList.appendChild(this.createEmailListItemNode(email));
    }
    showEmailContents(email) {
        this.contentEmail.replaceChildren(this.createEmailContentNode(email));
    }
    createEmailContentNode(email) {
        const node = document.createElement('div');
        node.setAttribute('class', 'content-container-email-content');
        const subject = document.createTextNode(email.subject);
        node.appendChild(subject);
        const body = this.createLargeTextNode(email.body);
        node.appendChild(body);
        return node;
    }
    createEmailListItemNode(email) {
        const node = document.createElement('div');
        node.setAttribute('class', 'sidebar-list-item email unread');
        const subject = document.createTextNode(email.subject);
        node.appendChild(subject);
        return node;
    }
    showDocumentContents(doc) {
        this.contentDoc.replaceChildren(this.createDocContentNode(doc));
    }
    createLargeTextNode(text) {
        const body = document.createElement('div');
        text.split('\n').forEach(line => {
            const pNode = document.createElement('p');
            pNode.appendChild(document.createTextNode(line));
            body.appendChild(pNode);
        });
        return body;
    }
    createDocContentNode(doc) {
        const node = document.createElement('div');
        node.setAttribute('class', 'content-container-document-content');
        const headerText = [doc.title_redacted, '-', doc.date].join(' ');
        const header = document.createTextNode(headerText);
        node.appendChild(header);
        const body = this.createLargeTextNode(doc.body_redacted);
        node.appendChild(body);
        return node;
    }
    createDocListItem(doc) {
        const node = document.createElement('div');
        node.setAttribute('class', 'sidebar-list-item document unread');
        const headerText = [doc.title_redacted, '-', doc.date].join(' ');
        const header = document.createTextNode(headerText);
        node.appendChild(header);
        return node;
    }
    insertDocument(doc, index) {
        const newNode = this.createDocListItem(doc);
        const beforeNode = this.sidebarDocList.children[index];
        this.sidebarDocList.insertBefore(newNode, beforeNode);
    }
    setActiveTab(tab) {
        const [activeTab, inactiveTab] = tab === Tab.Emails ? [this.sidebarTabs[0], this.sidebarTabs[1]] : [this.sidebarTabs[1], this.sidebarTabs[0]];
        const [activeList, inactiveList] = tab === Tab.Emails ? [this.sidebarEmailList, this.sidebarDocList] : [this.sidebarDocList, this.sidebarEmailList];
        const [activeContent, inactiveContent] = tab === Tab.Emails ? [this.contentEmail, this.contentDoc] : [this.contentDoc, this.contentEmail];
        this.ensureClass(activeTab, 'selected');
        inactiveTab.classList.remove('selected');
        this.showElement(activeList);
        this.hideElement(inactiveList);
        this.showElement(activeContent);
        this.hideElement(inactiveContent);
    }
    ensureClass(element, className) {
        if (!element.classList.contains(className)) {
            element.classList.add(className);
        }
    }
    hideElement(element) {
        this.ensureClass(element, 'hidden');
    }
    showElement(element) {
        element.classList.remove('hidden');
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield init();
        init_panic_hook();
        const gs = GameState.new([
            "a document\n1990-12-15\n\nthis [is] a [document]\nit's cool",
            "something else [entirely]\n1990-12-15\n\nthis one's [even\ncooler]",
            "a really really really really really really long title\n1990-12-15\n\nthis one's [even\ncooler]",
        ]);
        const view = new GameView();
        const manager = new GameManager(gs, view);
        manager.setup();
    });
}
run();
