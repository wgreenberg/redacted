import init, {init_panic_hook, GameState, Document, GameStateEvent, Email} from './pkg/redacted_rs.js';

enum Tab {
    Emails,
    Documents,
}

enum UiEventKind {
    AttachmentNotificationClicked,
    EmailNotificationClicked,
    DocumentListItemClicked,
    EmailListItemClicked,
    FoiaSubmitted,
    TabClicked,
}
interface AttachmentNotificationClicked {
    kind: UiEventKind.AttachmentNotificationClicked;
    index: number;
};
interface EmailNotificationClicked {
    kind: UiEventKind.EmailNotificationClicked;
    index: number;
}
interface DocumentListItemClicked {
    kind: UiEventKind.DocumentListItemClicked;
    index: number;
}
interface EmailListItemClicked {
    kind: UiEventKind.EmailListItemClicked;
    index: number;
}
interface FoiaSubmitted {
    kind: UiEventKind.FoiaSubmitted;
    input: string;
    year: number;
}
interface TabClicked {
    kind: UiEventKind.TabClicked;
    tab: Tab;
}
type UiEvent = AttachmentNotificationClicked |
    EmailNotificationClicked |
    DocumentListItemClicked |
    EmailListItemClicked |
    FoiaSubmitted |
    TabClicked;

class GameManager {
    public activeTab: Tab;
    public docs: Document[] = [];
    public emails: Email[] = [];

    private notificationEmails: Email[] = [];
    private notificationAttachments: Document[] = [];

    constructor(public gameState: GameState, public gameView: GameView) {
        this.setActiveTab(Tab.Emails);
        this.checkForEvents();
        this.gameView.setEventHandler(e => {
            console.log(UiEventKind[e.kind], e);
            if (e.kind === UiEventKind.TabClicked) {
                this.setActiveTab(e.tab);
            } else if (e.kind === UiEventKind.FoiaSubmitted) {
                this.submitFoiaQuery(e.input, e.year);
            } else if (e.kind === UiEventKind.DocumentListItemClicked) {
                this.gameView.showDocumentContents(this.docs[e.index]);
            } else if (e.kind === UiEventKind.AttachmentNotificationClicked) {
                const doc = this.notificationAttachments[e.index];
                const index = 0; // TODO sort docs correctly
                this.docs.splice(index, 0, doc);
                this.setActiveTab(Tab.Documents);
                this.gameView.removeAttachmentNotification(e.index);
                this.gameView.insertDocument(doc, index);
            } else if (e.kind === UiEventKind.EmailNotificationClicked) {
                const email = this.notificationEmails[e.index];
                this.emails.push(email);
                this.setActiveTab(Tab.Emails);
                this.gameView.removeEmailNotification(e.index);
                this.gameView.appendEmail(email);
            } else if (e.kind === UiEventKind.EmailListItemClicked) {
                this.gameView.showEmailContents(this.emails[e.index]);
            }
        });
    }

    submitFoiaQuery(input: string, year: number) {
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

    setActiveTab(target: Tab) {
        this.activeTab = target;
        this.gameView.setActiveTab(target);
    }

    checkForEvents() {
        this.gameState.drain_events().forEach((event: GameStateEvent) => {
            event.emails.forEach(email => {
                this.createEmailNotification(email);
            });
        });
    }
}

class GameView {
    public sidebarTabs: HTMLElement[];
    public sidebarEmailList: HTMLElement;
    public sidebarDocList: HTMLElement;
    public contentEmail: HTMLElement;
    public contentDoc: HTMLElement;
    public foiaForm: HTMLElement;
    public notificationsList: HTMLElement;

    private eventHandler: (event: UiEvent) => void;

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

    setEventHandler(handler: (e: UiEvent) => void) {
        this.eventHandler = handler;
    }

    private hookupEvents() {
        this.foiaForm.addEventListener('submit', e => {
            e.preventDefault();
            const input = <HTMLInputElement>document.getElementById('foia-input')!;
            const year = <HTMLInputElement>document.getElementById('foia-year')!;
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
            this.emit({ kind: UiEventKind.TabClicked, tab: Tab.Emails })
        });
        this.sidebarTabs[1].addEventListener('click', e => {
            this.emit({ kind: UiEventKind.TabClicked, tab: Tab.Documents })
        });
        this.notificationsList.addEventListener('click', e => {
            if (e.target instanceof HTMLElement) {
                const index = parseInt(e.target.dataset.index);
                if (e.target.classList.contains('notification-email')) {
                    this.emit({ kind: UiEventKind.EmailNotificationClicked, index: index });
                } else if (e.target.classList.contains('notification-attachment')) {
                    this.emit({ kind: UiEventKind.AttachmentNotificationClicked, index: index });
                }
            }
        })
    }

    private emit(event: UiEvent) {
        if (this.eventHandler) {
            this.eventHandler(event);
        }
    }

    appendEmailNotification(index: number) {
        const node = document.createElement('div');
        const icon = document.createElement('img');
        node.dataset.index = index.toString();
        //icon.setAttribute('src', 'img/mail.png');
        node.setAttribute('class', 'notification-email');
        node.appendChild(icon);
        this.notificationsList.appendChild(node);
    }

    appendAttachmentNotification(index: number) {
        const node = document.createElement('div');
        node.dataset.index = index.toString();
        const icon = document.createElement('img');
        //icon.setAttribute('src', 'img/attachment.png');
        node.setAttribute('class', 'notification-attachment');
        node.appendChild(icon);
        this.notificationsList.appendChild(node);
    }

    removeEmailNotification(index: number) {
        this.notificationsList.querySelector(`.notification-email[data-index="${index}"]`).remove();
    }

    removeAttachmentNotification(index: number) {
        this.notificationsList.querySelector(`.notification-attachment[data-index="${index}"]`).remove();
    }

    appendEmail(email: Email) {
        this.sidebarEmailList.appendChild(this.createEmailListItemNode(email));
    }

    showEmailContents(email: Email) {
        this.contentEmail.replaceChildren(this.createEmailContentNode(email));
    }

    private createEmailContentNode(email: Email): HTMLElement {
        const node = document.createElement('div');
        node.setAttribute('class', 'content-container-email-content');
        const subject = document.createTextNode(email.subject);
        node.appendChild(subject);
        const body = document.createTextNode(email.body);
        node.appendChild(body);
        return node;
    }

    private createEmailListItemNode(email: Email): HTMLElement {
        const node = document.createElement('div');
        node.setAttribute('class', 'sidebar-list-emails-item');
        const subject = document.createTextNode(email.subject);
        node.appendChild(subject);
        return node;
    }

    showDocumentContents(doc: Document) {
        this.contentDoc.replaceChildren(this.createDocContentNode(doc));
    }

    private createDocContentNode(doc: Document): HTMLElement {
        const node = document.createElement('div');
        node.setAttribute('class', 'content-container-document-content');
        const title = document.createTextNode(doc.title_redacted);
        node.appendChild(title);
        const date = document.createTextNode(doc.date);
        node.appendChild(date);
        const body = document.createTextNode(doc.body_redacted);
        node.appendChild(body);
        return node;
    }

    private createDocListItem(doc: Document): HTMLElement {
        const node = document.createElement('div');
        node.setAttribute('class', 'sidebar-list-documents-item');
        const title = document.createTextNode(doc.title_redacted);
        const date = document.createTextNode(doc.date);
        node.appendChild(title);
        node.appendChild(date);
        return node;
    }

    insertDocument(doc: Document, index: number) {
        const newNode = this.createDocListItem(doc);
        const beforeNode = this.sidebarDocList.children[index];
        this.sidebarDocList.insertBefore(newNode, beforeNode);
    }

    setActiveTab(tab: Tab) {
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

    private ensureClass(element: Element, className: string) {
        if (!element.classList.contains(className)) {
            element.classList.add(className);
        }
    }

    private hideElement(element: Element) {
        this.ensureClass(element, 'hidden');
    }

    private showElement(element: Element) {
        element.classList.remove('hidden');
    }
}

async function run(): Promise<void> {
    await init();
    init_panic_hook();

    const gs = GameState.new([
        "a document\n1990-12-15\n\nthis [is] a [document]\nit's cool",
        "something else [entirely]\n1991-12-15\n\nthis one's [even\ncooler]",
    ]);

    const view = new GameView();
    const manager = new GameManager(gs, view);
}

run();