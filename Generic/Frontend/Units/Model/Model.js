import {EventManager} from '/$/Packages/Generic/Frontend/Units/EventManager/EventManager.js';

import {Common} from '/$/Packages/Generic/Js/Common/Common.js';


export class Model extends EventTarget {
    static propDefault = 'value';


    _filterCallbackBinded = this._filterCallback.bind(this);
    _items = [];
    _sortCallbackBinded = this._sortCallback.bind(this);


    filterProp = this.constructor.propDefault;
    filterRegExp = null;
    sortOrder = 1;
    sortProp = this.constructor.propDefault;


    _filterCallback(item) {
        return this.filterRegExp && this.filterProp ? this.filterRegExp.test(item.data[this.filterProp]) : true;
    }

    _sortCallback(item1, item2) {
        let value1 = item1.data[this.sortProp];
        let value2 = item2.data[this.sortProp];

        return value1 > value2 ? this.sortOrder : (value1 < value2 ? -this.sortOrder : !value1);
    }

    _updateIndexes(indexFirst = 0) {
        for (let i = indexFirst; i < this._items.length; i++) {
            this._items[i].index = i;
        }
    }


    add(itemDescriptors, index = Infinity) {
        if (!(itemDescriptors instanceof Array)) {
            itemDescriptors = [itemDescriptors];
        }

        if (!itemDescriptors.length) return;

        let items = [];

        for (let itemDescriptor of itemDescriptors) {
            if (!(itemDescriptor instanceof Object)) {
                itemDescriptor = {[this.constructor.propDefault]: itemDescriptor};
            }

            let item = {
                data: itemDescriptor,
                excluded: false,
                index: undefined,
            };
            items.push(item);
        }

        index = Common.toRange(index, 0, this._items.length);
        let itemRelative = this._items[index];
        this._items.splice(index, 0, ...items);
        this._updateIndexes(index);
        EventManager.dispatchEvent(this, 'add', {index, itemRelative, items});
    }

    clear() {
        this._items.length = 0;
        EventManager.dispatchEvent(this, 'clear');
    }

    delete(indexes) {
        if (!this._items.length) return;

        if (!(indexes instanceof Array)) {
            indexes = [indexes];
        }

        let items = [];

        for (let index of indexes) {
            let item = this._items[index];

            if (!item) continue;

            items.push(item);
            delete this._items[index];
        }

        if (!items.length) return;

        this._items = this._items.flat();
        this._updateIndexes();
        EventManager.dispatchEvent(this, 'delete', {items});
    }

    deleteSome(index, count = 1) {
        if (!this._items.length) return;

        count = Common.toRange(count, 1, this._items.length);
        index = Common.toRange(index, 0, this._items.length - count);

        let items = this._items.splice(index, count);
        this._updateIndexes(index);
        EventManager.dispatchEvent(this, 'delete', {items});
    }

    filter(callback = this._filterCallbackBinded) {
        if (!this._items.length) return;

        for (let item of this._items) {
            item.excluded = !callback(item);
        }

        EventManager.dispatchEvent(this, 'filter');
    }

    find(callback) {
        return this._items.filter(callback);
    }

    move(indexFrom, indexTo, count = 1) {
        if (this._items.length < 2) return;

        count = Common.toRange(count, 1, this._items.length);
        let indexMax = this._items.length - count;
        indexFrom = Common.toRange(indexFrom, 0, indexMax);
        indexTo = Common.toRange(indexTo, 0, indexMax);

        if (indexFrom == indexTo) return;

        let items = this._items.splice(indexFrom, count);
        this._items.splice(indexTo, 0, ...items);
        this._updateIndexes(Math.min(indexFrom, indexTo));
        EventManager.dispatchEvent(this, 'order');
    }

    sort(callback = this._sortCallbackBinded) {
        if (!this._items.length || callback == this._sortCallbackBinded && !(this.sortOrder && this.sortProp)) return;

        this._items.sort(callback);
        this._updateIndexes();
        EventManager.dispatchEvent(this, 'order');
    }

    update(index, data) {
        let item = this._items[index];

        if (!item) return;

        let dataPrev = {};
        let updated = false;

        for (let k in data) {
            if (item.data[k] === data[k]) continue;

            dataPrev[k] = item.data[k];
            item.data[k] = data[k];
            updated = true;
        }

        if (!updated) return;

        EventManager.dispatchEvent(this, 'update', {item, dataPrev});
    }
}
