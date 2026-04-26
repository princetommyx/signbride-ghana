import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {IonButton} from '@ionic/angular/standalone';
import {GeminiChatContext, GeminiChatMessage, GeminiChatService} from './gemini-chat.service';
import {Store} from '@ngxs/store';
import {Router} from '@angular/router';
import {marked} from 'marked';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.scss'],
  imports: [IonButton, FormsModule],
})
export class ChatbotWidgetComponent {
  private store = inject(Store);
  private chatService = inject(GeminiChatService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('messagesList') messagesList?: ElementRef<HTMLDivElement>;

  isOpen = false;
  isSending = false;
  errorMessage = '';
  inputText = '';
  messages: GeminiChatMessage[] = [
    {
      role: 'assistant',
      text: 'Hello! I am your Ghana Sign Language (GSL) assistant. I can help with translations, signs, and questions about GSL.',
    },
  ];

  get canSend(): boolean {
    return !this.isSending && !!this.inputText.trim();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.scrollToBottom();
      // Focus the textarea when opening
      setTimeout(() => {
        const textarea = document.querySelector('.chat-input textarea') as HTMLTextAreaElement;
        textarea?.focus();
      }, 500);
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const userText = this.inputText.trim();
    if (!userText || this.isSending) {
      return;
    }

    const context = this.getContext();

    this.errorMessage = '';
    this.messages.push({role: 'user', text: userText});
    this.inputText = '';
    this.isSending = true;
    this.scrollToBottom();

    const botMessage: GeminiChatMessage = {role: 'assistant', text: ''};
    this.messages.push(botMessage);

    this.chatService.sendMessage({messages: this.messages.slice(0, -2), userMessage: userText, context}).subscribe({
      next: reply => {
        botMessage.text = reply;
        this.scrollToBottom();
      },
      error: err => {
        console.error('Chat error', err);
        this.errorMessage = err.message || 'Unable to get a response right now. Please try again in a moment.';
        this.isSending = false;
        if (!botMessage.text) {
          this.messages.pop(); // Remove empty bot message on error
        }
        this.scrollToBottom();
      },
      complete: () => {
        this.isSending = false;
      },
    });

    // Safety timeout: if no response in 15s, reset the sending state so the user can type again
    setTimeout(() => {
      if (this.isSending) {
        this.isSending = false;
        if (!botMessage.text) {
          this.errorMessage = 'The response is taking longer than usual. You can try sending again.';
        }
      }
    }, 15000);
  }

  getDictionaryLink(text: string): string | null {
    const match = text.match(/\[See "(.*?)" in Dictionary\]/);
    return match ? match[1] : null;
  }

  renderMarkdown(text: string): SafeHtml {
    const stripped = this.stripDictionaryLink(text);
    const html = marked.parse(stripped) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  stripDictionaryLink(text: string): string {
    return text.replace(/\[See "(.*?)" in Dictionary\]/, '').trim();
  }

  goToDictionary(word: string) {
    this.router.navigate(['/dictionary'], {queryParams: {search: word}});
    this.isOpen = false;
  }

  private getContext(): GeminiChatContext {
    return {
      spokenToSigned: this.store.selectSnapshot(state => state.translate.spokenToSigned),
      spokenLanguage: this.store.selectSnapshot(state => state.translate.spokenLanguage),
      signedLanguage: this.store.selectSnapshot(state => state.translate.signedLanguage),
      detectedLanguage: this.store.selectSnapshot(state => state.translate.detectedLanguage),
    };
  }

  private scrollToBottom() {
    setTimeout(() => {
      const element = this.messagesList?.nativeElement;
      if (!element) {
        return;
      }
      element.scrollTop = element.scrollHeight;
    });
  }
}
