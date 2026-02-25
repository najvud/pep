/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'ru' | 'en';

const LANG_STORAGE_KEY = 'todo-board-lang';

type Dict = Record<string, string>;

const messages: Record<Lang, Dict> = {
  ru: {
    'app.name': 'Planёrka',
    'common.untitled': 'Без названия',
    'common.close': 'Закрыть',
    'common.cancel': 'Отмена',
    'common.save': 'Сохранить',
    'common.create': 'Создать',
    'common.clear': 'Очистить',
    'common.reset': 'Сброс',
    'common.search': 'Поиск',
    'common.openSearch': 'Открыть поиск',
    'common.clearSearch': 'Очистить поиск',
    'common.wait': 'Подождите…',

    'lang.short.ru': 'RU',
    'lang.short.en': 'EN',
    'lang.switchTo': 'Переключить язык на {lang}',
    'lang.name.ru': 'русский',
    'lang.name.en': 'английский',

    'auth.subtitle': 'Великое начинается с малого.',
    'auth.mode.aria': 'Режим авторизации',
    'auth.tab.login': 'Вход',
    'auth.tab.register': 'Регистрация',
    'auth.label.login': 'Логин',
    'auth.label.email': 'Email',
    'auth.label.password': 'Пароль',
    'auth.label.confirm': 'Подтверждение пароля',
    'auth.placeholder.login': 'Ivan',
    'auth.placeholder.email': 'name@example.com',
    'auth.placeholder.password': 'Минимум 6 символов',
    'auth.placeholder.confirm': 'Повторите пароль',
    'auth.password.show': 'Показать пароль',
    'auth.password.hide': 'Скрыть пароль',
    'auth.hint.invalidLogin': 'Логин: только буквы латиницы/кириллицы, 2-32 символа.',
    'auth.hint.invalidEmail': 'Введите корректный email.',
    'auth.hint.weakPassword': 'Пароль должен быть не короче 6 символов.',
    'auth.hint.passwordMismatch': 'Пароли не совпадают.',
    'auth.submit.login': 'Войти',
    'auth.submit.register': 'Создать аккаунт',
    'auth.copyright': 'Planёrka 2026. Все права защищены ©.',

    'auth.error.serverUnavailable': 'Сервер недоступен. Запусти `npm run server` и попробуй снова.',
    'auth.error.invalidLogin': 'Логин: только буквы латиницы/кириллицы, 2-32 символа.',
    'auth.error.invalidEmail': 'Неверный формат email.',
    'auth.error.weakPassword': 'Пароль слишком короткий.',
    'auth.error.loginTaken': 'Этот логин уже занят.',
    'auth.error.emailTaken': 'Этот email уже используется.',
    'auth.error.invalidCredentials': 'Неверный логин или пароль.',
    'auth.error.unauthorized': 'Сессия истекла, войдите снова.',
    'auth.error.badJson': 'Ошибка формата запроса.',
    'auth.error.request': 'Ошибка запроса.',
    'auth.error.fallback': 'Не удалось выполнить запрос. Проверь сервер и попробуй снова.',

    'boot.checkingSession': 'Проверка сессии…',

    'board.subtitleGuest': 'Поиск (debounce) + умный таймер',
    'board.logout': 'Выйти',
    'board.profile': 'Карточка участника',
    'board.favorites': 'Избранное',
    'board.searchPlaceholder': 'Поиск по задачам…',
    'board.filter.show': 'Показать фильтры',
    'board.filter.hide': 'Скрыть фильтры',
    'board.createCard': 'Создать карточку',
    'board.dropHere': 'Отпустить сюда',
    'board.cardOpen': 'Открыть карточку',
    'card.id.title': 'ID: {id}',
    'card.creator.title': 'Создатель: {name}',
    'card.creator.inline': 'Автор: {name}',
    'card.creator.unknown': 'Без автора',
    'card.createdAt.inline': 'Создана: {date}',
    'card.comments.title': 'Комментарии: {count}',
    'card.timer.title': 'В "Делаем": {time}',
    'card.checklist.title': 'Чек-лист: {done}/{total}',
    'card.favorite.add': 'В избранное',
    'card.favorite.remove': 'Убрать из избранного',
    'favorites.empty': 'Пока нет избранных карточек.',

    'column.queue': 'Очередь',
    'column.doing': 'Делаем',
    'column.review': 'Проверка',
    'column.done': 'Сделано',
    'column.freedom': 'Свобода',

    'empty.queue': 'Поставь себе задачу.',
    'empty.doing': 'Сделай ее.',
    'empty.review': 'Проверь.',
    'empty.done': 'Спасибо за работу!',
    'empty.hint.doing': 'Перетащи сюда карточку из "Очереди".',
    'empty.hint.review': 'Перетащи сюда, чтобы подтвердить выполнение.',
    'empty.hint.done': 'Перетащи сюда после завершения.',
    'empty.filtered': 'Ничего не найдено по фильтру',

    'urgency.all': 'Все',
    'urgency.white': 'Низкая',
    'urgency.yellow': 'Серьезная',
    'urgency.pink': 'Критическая',
    'urgency.red': 'Неотложная',

    'history.title': 'История',
    'history.clear': 'Очистить историю',
    'history.filter.aria': 'Фильтр истории',
    'history.filter.all': 'Все',
    'history.filter.create': 'Созданы',
    'history.filter.move': 'Перемещения',
    'history.filter.delete': 'Удаления',
    'history.filter.restore': 'Восстановления',
    'history.empty': 'Тащи карточки - тут появятся события',
    'history.empty.filtered': 'Нет событий в выбранном фильтре.',
    'history.more': 'Показать еще ({count})',
    'history.today': 'Сегодня',
    'history.yesterday': 'Вчера',

    'history.event.create': 'Карточка "{title}" создана в "{to}"',
    'history.event.move': 'Карточка "{title}" перемещена: "{from}" → "{to}"',
    'history.event.delete': 'Карточка "{title}" удалена из "{from}"',
    'history.event.restore': 'Карточка "{title}" восстановлена в "{to}"',
    'history.event.timer.started': ' (таймер запущен)',
    'history.event.timer.stopped': ' (таймер остановлен)',
    'history.event.timer.delta': ' (+{delta} в "Делаем")',

    'modal.create.title': 'Новая карточка',
    'modal.create.titleLabel': 'Заголовок',
    'modal.create.titlePlaceholder': 'Например: Сходить в магазин',
    'modal.create.textLabel': 'Текст',
    'modal.create.textPlaceholder': 'Подробности…',
    'modal.create.urgencyLabel': 'Срочность',
    'modal.create.urgencyAria': 'Срочность',
    'modal.images.title': 'Вложения',
    'modal.images.add': 'Прикрепить изображение',
    'modal.images.preview': 'Открыть изображение',
    'modal.images.remove': 'Удалить изображение',
    'modal.images.item': 'Изображение карточки',
    'modal.images.prev': 'Предыдущее изображение',
    'modal.images.next': 'Следующее изображение',
    'modal.images.counter': '{current}/{total}',
    'modal.images.error.limit': 'Лимит: до {maxCount} файлов, каждый до {maxSizeKb} KB.',
    'modal.images.error.quota': 'Превышен лимит медиа-хранилища аккаунта.',
    'modal.images.error.rateLimit': 'Слишком часто загружаешь изображения. Подожди немного и попробуй снова.',
    'modal.images.error.load': 'Не удалось загрузить изображение.',

    'modal.edit.titleLabel': 'Заголовок',
    'modal.edit.textLabel': 'Текст',
    'modal.edit.done': 'Задача завершена',
    'modal.edit.edit': 'Редактировать',
    'modal.status.label': 'Статус',
    'modal.status.change': 'Изменить статус',
    'modal.checklist.title': 'Чек-лист',
    'modal.checklist.progress': '{done}/{total}',
    'modal.checklist.empty': 'Пока нет пунктов.',
    'modal.checklist.placeholder': 'Новый пункт…',
    'modal.checklist.add': 'Добавить',
    'modal.checklist.toggle': 'Переключить пункт',
    'modal.checklist.remove': 'Удалить пункт',
    'modal.comments.title': 'Комментарии',
    'modal.comments.empty': 'Пока нет комментариев.',
    'modal.comments.truncated': 'Показаны только последние {count} комментариев',
    'modal.comments.placeholder': 'Добавить комментарий…',
    'modal.comments.submit': 'Отправить',
    'modal.comments.edit': 'Изменить',
    'modal.comments.delete': 'Удалить',
    'modal.comments.openSingle': 'Открыть комментарий отдельно',
    'modal.comments.deleteConfirm': 'Удалить этот комментарий?',
    'modal.comments.showOlder': 'Показать более ранние ({count})',
    'modal.comments.showRecent': 'Показать последние',
    'modal.comments.error.add': 'Не удалось добавить комментарий. Попробуйте еще раз.',
    'modal.comments.error.update': 'Не удалось сохранить комментарий. Попробуйте еще раз.',
    'modal.comments.error.delete': 'Не удалось удалить комментарий. Попробуйте еще раз.',
    'modal.comments.error.rateLimit': 'Слишком часто выполняются действия с комментариями. Подожди немного и повтори.',
    'modal.comments.sendHint': 'Enter — отправить, Shift+Enter — новая строка',
    'modal.comments.author.unknown': 'Без имени',
    'modal.comments.time.unknown': 'без времени',
    'modal.comments.toolbar.bold': 'Жирный',
    'modal.comments.toolbar.italic': 'Курсив',
    'modal.comments.toolbar.strike': 'Зачеркнутый',
    'modal.comments.toolbar.list': 'Список',
    'modal.comments.toolbar.textColor': 'Цвет текста',
    'modal.comments.toolbar.highlight': 'Цвет выделения',
    'modal.comments.images.add': 'Изображение к комментарию',
    'modal.comments.images.title': 'Вложения комментария',
    'modal.comments.images.preview': 'Открыть изображение комментария',
    'modal.comments.images.remove': 'Удалить изображение комментария',
    'modal.comments.images.item': 'Изображение комментария',
    'modal.comments.archive.title': 'Архив',
    'modal.comments.archive.open': 'Архив',
    'modal.comments.archive.back': 'Назад',
    'modal.comments.archive.count': 'Всего: {count}',
    'modal.comments.archive.empty': 'Архив комментариев пуст.',
    'modal.comments.archive.loadMore': 'Загрузить еще',
    'modal.comments.archive.restore': 'Восстановить',
    'modal.comments.archive.createdAt': 'Создан: {date}',
    'modal.comments.archive.archivedAt': 'В архиве: {date}',
    'modal.comments.archive.reason.all': 'Все',
    'modal.comments.archive.reason.overflow': 'Лимит',
    'modal.comments.archive.reason.delete': 'Удаление',
    'modal.comments.archive.reason.cardDelete': 'Удалена карточка',
    'modal.comments.archive.error.load': 'Не удалось загрузить архив комментариев.',
    'modal.comments.archive.error.restore': 'Не удалось восстановить комментарий.',
    'modal.comments.archive.notice.restored': 'Комментарий восстановлен.',
    'modal.timer.title': 'В "Делаем" (чч:мм:сс, после 24ч: дд / чч)',

    'profile.title': 'Карточка участника',
    'profile.avatar.upload': 'Загрузить аватар',
    'profile.avatar.remove': 'Удалить аватар',
    'profile.avatar.change': 'Сменить',
    'profile.login': 'Логин',
    'profile.email': 'Почта',
    'profile.firstName': 'Имя',
    'profile.lastName': 'Фамилия',
    'profile.birthDate': 'Дата рождения',
    'profile.role': 'Должность',
    'profile.role.empty': 'Должность не указана',
    'profile.tasksCreated': 'Заведено задач',
    'profile.tasksDoing': 'В работе',
    'profile.tasksDone': 'Закрыто',
    'profile.commentsTotal': 'Комментариев',
    'profile.saved': 'Сохранено',
    'profile.mode.switch': 'Режим карточки участника',
    'profile.mode.view': 'Просмотр',
    'profile.mode.edit': 'Редактирование',
    'profile.section.identity': 'Основное',
    'profile.section.details': 'Данные',
    'profile.section.about': 'О себе',
    'profile.city': 'Город',
    'profile.about': 'О себе',
    'profile.placeholder.firstName': 'Как к вам обращаться',
    'profile.placeholder.lastName': 'Фамилия',
    'profile.placeholder.role': 'Например: Backend разработчик',
    'profile.placeholder.city': 'Например: Москва',
    'profile.placeholder.about': 'Пара слов о себе…',
    'profile.save': 'Сохранить изменения',
    'profile.error.loginRequired': 'Логин не может быть пустым.',
    'profile.error.invalidLogin': 'Логин: только буквы латиницы/кириллицы, 2-32 символа.',
    'profile.error.invalidFirstName': 'Имя: 2-48 символов, буквы, пробел, дефис или апостроф.',
    'profile.error.invalidLastName': 'Фамилия: 2-48 символов, буквы, пробел, дефис или апостроф.',
    'profile.error.invalidRole': 'Должность: 2-64 символа, буквы/цифры и базовые знаки.',
    'profile.error.invalidCity': 'Город: 2-64 символа, буквы/цифры и базовые знаки.',
    'profile.error.invalidAbout': 'Поле "О себе": не более 150 символов.',
    'profile.error.loginTaken': 'Этот логин уже занят.',
    'profile.error.invalidBirthDate': 'Некорректная дата рождения. Доступно только 16+.',
    'profile.error.avatarTooLarge': 'Аватар слишком большой (до 700 KB).',
    'profile.error.avatarInvalid': 'Не удалось обработать изображение.',
    'profile.error.save': 'Не удалось сохранить профиль.',

    'toast.deleted': 'Удалено:',
    'toast.undo': 'Отменить',
    'toast.close': 'Закрыть',

    'trash.title': 'Перетащи карточку сюда, чтобы удалить',
    'trash.aria': 'Удалить карточку перетаскиванием',

    'time.dayHour': '{days}д / {hours}ч',
    'time.delta.lt1m': '<1м',
    'time.delta.min': '{m}м',
    'time.delta.hourMin': '{h}ч {m}м',
  },
  en: {
    'app.name': 'Planёrka',
    'common.untitled': 'Untitled',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.create': 'Create',
    'common.clear': 'Clear',
    'common.reset': 'Reset',
    'common.search': 'Search',
    'common.openSearch': 'Open search',
    'common.clearSearch': 'Clear search',
    'common.wait': 'Please wait…',

    'lang.short.ru': 'RU',
    'lang.short.en': 'EN',
    'lang.switchTo': 'Switch language to {lang}',
    'lang.name.ru': 'Russian',
    'lang.name.en': 'English',

    'auth.subtitle': 'Great things start small.',
    'auth.mode.aria': 'Authorization mode',
    'auth.tab.login': 'Sign in',
    'auth.tab.register': 'Register',
    'auth.label.login': 'Login',
    'auth.label.email': 'Email',
    'auth.label.password': 'Password',
    'auth.label.confirm': 'Confirm password',
    'auth.placeholder.login': 'Ivan',
    'auth.placeholder.email': 'name@example.com',
    'auth.placeholder.password': 'At least 6 characters',
    'auth.placeholder.confirm': 'Repeat password',
    'auth.password.show': 'Show password',
    'auth.password.hide': 'Hide password',
    'auth.hint.invalidLogin': 'Login: letters only (Latin/Cyrillic), 2-32 characters.',
    'auth.hint.invalidEmail': 'Enter a valid email.',
    'auth.hint.weakPassword': 'Password must be at least 6 characters.',
    'auth.hint.passwordMismatch': 'Passwords do not match.',
    'auth.submit.login': 'Sign in',
    'auth.submit.register': 'Create account',
    'auth.copyright': 'Planёrka 2026. All rights reserved ©.',

    'auth.error.serverUnavailable': 'Server is unavailable. Run `npm run server` and try again.',
    'auth.error.invalidLogin': 'Login: letters only (Latin/Cyrillic), 2-32 characters.',
    'auth.error.invalidEmail': 'Invalid email format.',
    'auth.error.weakPassword': 'Password is too short.',
    'auth.error.loginTaken': 'This login is already taken.',
    'auth.error.emailTaken': 'This email is already used.',
    'auth.error.invalidCredentials': 'Invalid login or password.',
    'auth.error.unauthorized': 'Session expired, please sign in again.',
    'auth.error.badJson': 'Invalid request format.',
    'auth.error.request': 'Request error.',
    'auth.error.fallback': 'Request failed. Check server and try again.',

    'boot.checkingSession': 'Checking session…',

    'board.subtitleGuest': 'Search (debounce) + smart timer',
    'board.logout': 'Log out',
    'board.profile': 'Member card',
    'board.favorites': 'Favorites',
    'board.searchPlaceholder': 'Search tasks…',
    'board.filter.show': 'Show filters',
    'board.filter.hide': 'Hide filters',
    'board.createCard': 'Create card',
    'board.dropHere': 'Drop here',
    'board.cardOpen': 'Open card',
    'card.id.title': 'ID: {id}',
    'card.creator.title': 'Created by: {name}',
    'card.creator.inline': 'Author: {name}',
    'card.creator.unknown': 'Unknown author',
    'card.createdAt.inline': 'Created: {date}',
    'card.comments.title': 'Comments: {count}',
    'card.timer.title': 'In "Doing": {time}',
    'card.checklist.title': 'Checklist: {done}/{total}',
    'card.favorite.add': 'Add to favorites',
    'card.favorite.remove': 'Remove from favorites',
    'favorites.empty': 'No favorite cards yet.',

    'column.queue': 'Queue',
    'column.doing': 'Doing',
    'column.review': 'Review',
    'column.done': 'Done',
    'column.freedom': 'Freedom',

    'empty.queue': 'Give yourself a task.',
    'empty.doing': 'Do it.',
    'empty.review': 'Confirm completion',
    'empty.done': 'Thanks for your work!',
    'empty.hint.doing': 'Drag a card here from "Queue".',
    'empty.hint.review': 'Drag here to confirm completion.',
    'empty.hint.done': 'Drag here after completion.',
    'empty.filtered': 'Nothing found by filter',

    'urgency.all': 'All',
    'urgency.white': 'Low',
    'urgency.yellow': 'Serious',
    'urgency.pink': 'Critical',
    'urgency.red': 'Urgent',

    'history.title': 'History',
    'history.clear': 'Clear history',
    'history.filter.aria': 'History filter',
    'history.filter.all': 'All',
    'history.filter.create': 'Created',
    'history.filter.move': 'Moved',
    'history.filter.delete': 'Deleted',
    'history.filter.restore': 'Restored',
    'history.empty': 'No events yet. Drag cards and events will appear here.',
    'history.empty.filtered': 'No events for selected filter.',
    'history.more': 'Show more ({count})',
    'history.today': 'Today',
    'history.yesterday': 'Yesterday',

    'history.event.create': 'Card "{title}" created in "{to}"',
    'history.event.move': 'Card "{title}" moved: "{from}" → "{to}"',
    'history.event.delete': 'Card "{title}" deleted from "{from}"',
    'history.event.restore': 'Card "{title}" restored to "{to}"',
    'history.event.timer.started': ' (timer started)',
    'history.event.timer.stopped': ' (timer stopped)',
    'history.event.timer.delta': ' (+{delta} in "Doing")',

    'modal.create.title': 'New card',
    'modal.create.titleLabel': 'Title',
    'modal.create.titlePlaceholder': 'For example: Go shopping',
    'modal.create.textLabel': 'Text',
    'modal.create.textPlaceholder': 'Details…',
    'modal.create.urgencyLabel': 'Urgency',
    'modal.create.urgencyAria': 'Urgency',
    'modal.images.title': 'Attachments',
    'modal.images.add': 'Attach image',
    'modal.images.preview': 'Open image',
    'modal.images.remove': 'Remove image',
    'modal.images.item': 'Card image',
    'modal.images.prev': 'Previous image',
    'modal.images.next': 'Next image',
    'modal.images.counter': '{current}/{total}',
    'modal.images.error.limit': 'Limit: up to {maxCount} files, each up to {maxSizeKb} KB.',
    'modal.images.error.quota': 'Account media storage limit has been exceeded.',
    'modal.images.error.rateLimit': 'Too many image uploads. Please wait a moment and try again.',
    'modal.images.error.load': 'Failed to load image.',

    'modal.edit.titleLabel': 'Title',
    'modal.edit.textLabel': 'Text',
    'modal.edit.done': 'Task completed',
    'modal.edit.edit': 'Edit',
    'modal.status.label': 'Status',
    'modal.status.change': 'Change status',
    'modal.checklist.title': 'Checklist',
    'modal.checklist.progress': '{done}/{total}',
    'modal.checklist.empty': 'No checklist items yet.',
    'modal.checklist.placeholder': 'New item…',
    'modal.checklist.add': 'Add',
    'modal.checklist.toggle': 'Toggle item',
    'modal.checklist.remove': 'Remove item',
    'modal.comments.title': 'Comments',
    'modal.comments.empty': 'No comments yet.',
    'modal.comments.truncated': 'Showing only the latest {count} comments',
    'modal.comments.placeholder': 'Add a comment…',
    'modal.comments.submit': 'Send',
    'modal.comments.edit': 'Edit',
    'modal.comments.delete': 'Delete',
    'modal.comments.openSingle': 'Open comment',
    'modal.comments.deleteConfirm': 'Delete this comment?',
    'modal.comments.showOlder': 'Show older ({count})',
    'modal.comments.showRecent': 'Show recent',
    'modal.comments.error.add': 'Could not add comment. Please try again.',
    'modal.comments.error.update': 'Could not save comment. Please try again.',
    'modal.comments.error.delete': 'Could not delete comment. Please try again.',
    'modal.comments.error.rateLimit': 'Comment actions are happening too often. Please wait a moment and try again.',
    'modal.comments.sendHint': 'Enter to send, Shift+Enter for new line',
    'modal.comments.author.unknown': 'Unknown',
    'modal.comments.time.unknown': 'no time',
    'modal.comments.toolbar.bold': 'Bold',
    'modal.comments.toolbar.italic': 'Italic',
    'modal.comments.toolbar.strike': 'Strikethrough',
    'modal.comments.toolbar.list': 'List',
    'modal.comments.toolbar.textColor': 'Text color',
    'modal.comments.toolbar.highlight': 'Highlight color',
    'modal.comments.images.add': 'Image for comment',
    'modal.comments.images.title': 'Comment attachments',
    'modal.comments.images.preview': 'Open comment image',
    'modal.comments.images.remove': 'Remove comment image',
    'modal.comments.images.item': 'Comment image',
    'modal.comments.archive.title': 'Archive',
    'modal.comments.archive.open': 'Archive',
    'modal.comments.archive.back': 'Back',
    'modal.comments.archive.count': 'Total: {count}',
    'modal.comments.archive.empty': 'Comment archive is empty.',
    'modal.comments.archive.loadMore': 'Load more',
    'modal.comments.archive.restore': 'Restore',
    'modal.comments.archive.createdAt': 'Created: {date}',
    'modal.comments.archive.archivedAt': 'Archived: {date}',
    'modal.comments.archive.reason.all': 'All',
    'modal.comments.archive.reason.overflow': 'Limit',
    'modal.comments.archive.reason.delete': 'Deleted',
    'modal.comments.archive.reason.cardDelete': 'Card removed',
    'modal.comments.archive.error.load': 'Could not load comment archive.',
    'modal.comments.archive.error.restore': 'Could not restore comment.',
    'modal.comments.archive.notice.restored': 'Comment restored.',
    'modal.timer.title': 'In "Doing" (hh:mm:ss, after 24h: dd / hh)',

    'profile.title': 'Member card',
    'profile.avatar.upload': 'Upload avatar',
    'profile.avatar.remove': 'Remove avatar',
    'profile.avatar.change': 'Change',
    'profile.login': 'Login',
    'profile.email': 'Email',
    'profile.firstName': 'First name',
    'profile.lastName': 'Last name',
    'profile.birthDate': 'Birth date',
    'profile.role': 'Position',
    'profile.role.empty': 'Position is not specified',
    'profile.tasksCreated': 'Tasks created',
    'profile.tasksDoing': 'In progress',
    'profile.tasksDone': 'Completed',
    'profile.commentsTotal': 'Comments',
    'profile.saved': 'Saved',
    'profile.mode.switch': 'Member card mode',
    'profile.mode.view': 'View',
    'profile.mode.edit': 'Edit',
    'profile.section.identity': 'General',
    'profile.section.details': 'Details',
    'profile.section.about': 'About',
    'profile.city': 'City',
    'profile.about': 'About me',
    'profile.placeholder.firstName': 'How should we call you',
    'profile.placeholder.lastName': 'Last name',
    'profile.placeholder.role': 'For example: Backend engineer',
    'profile.placeholder.city': 'For example: London',
    'profile.placeholder.about': 'A few words about you…',
    'profile.save': 'Save changes',
    'profile.error.loginRequired': 'Login cannot be empty.',
    'profile.error.invalidLogin': 'Login: letters only (Latin/Cyrillic), 2-32 characters.',
    'profile.error.invalidFirstName': 'First name: 2-48 chars, letters, spaces, hyphen or apostrophe.',
    'profile.error.invalidLastName': 'Last name: 2-48 chars, letters, spaces, hyphen or apostrophe.',
    'profile.error.invalidRole': 'Position: 2-64 chars, letters/numbers and basic punctuation.',
    'profile.error.invalidCity': 'City: 2-64 chars, letters/numbers and basic punctuation.',
    'profile.error.invalidAbout': '"About me" must be up to 150 characters.',
    'profile.error.loginTaken': 'This login is already taken.',
    'profile.error.invalidBirthDate': 'Invalid birth date. Minimum age is 16.',
    'profile.error.avatarTooLarge': 'Avatar is too large (up to 700 KB).',
    'profile.error.avatarInvalid': 'Failed to process image.',
    'profile.error.save': 'Could not save profile.',

    'toast.deleted': 'Deleted:',
    'toast.undo': 'Undo',
    'toast.close': 'Close',

    'trash.title': 'Drag card here to delete',
    'trash.aria': 'Delete card by drag and drop',

    'time.dayHour': '{days}d / {hours}h',
    'time.delta.lt1m': '<1m',
    'time.delta.min': '{m}m',
    'time.delta.hourMin': '{h}h {m}m',
  },
};

function normalizeLang(value: string | null | undefined): Lang {
  return value === 'en' ? 'en' : 'ru';
}

function readInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) return normalizeLang(stored);
  } catch {
    // ignore
  }

  if (typeof navigator !== 'undefined') {
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('en')) return 'en';
  }

  return 'ru';
}

function formatTemplate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => String(vars[key] ?? ''));
}

type I18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  toggleLang: () => void;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readInitialLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ru' ? 'en' : 'ru');
  }, [lang, setLang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const dict = messages[lang] ?? messages.ru;
    const fallback = messages.ru;
    const template = dict[key] ?? fallback[key] ?? key;
    return formatTemplate(template, vars);
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    toggleLang,
    locale: lang === 'en' ? 'en-US' : 'ru-RU',
    t,
  }), [lang, setLang, toggleLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}

export function formatHistoryDelta(ms: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  const safe = Math.max(0, ms);
  if (safe < 60_000) return t('time.delta.lt1m');

  const totalMin = Math.floor(safe / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h <= 0) return t('time.delta.min', { m });
  return t('time.delta.hourMin', { h, m: String(m).padStart(2, '0') });
}




