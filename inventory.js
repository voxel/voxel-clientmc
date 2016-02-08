'use strict';

const ItemPile = require('itempile');
const mcData = require('./mcdata');

module.exports = (clientmc) => {
  function _newItemPile(mcName, count, tags) {
    if (count === undefined) count = 1;
    if (tags) throw new Error('_newItemPile tags not yet supported'); // TODO

    let ourName;

    ourName = mcData.mcBlockName2Voxel[mcName];
    if (!ourName) ourName = mcData.mcItemName2Voxel[mcName];
    if (!ourName) {
      console.warn(`Unrecognized/unsupported MC item: ${mcName}`);
      ourName = 'missing';
    }

    return new ItemPile(ourName, count);
  }

  clientmc.setSlot = (event) => {
    console.log('setSlot',event);
    if (!clientmc.carryPlugin) return;

    let mcSlot = 0;
    if (event.newItem) mcSlot = event.newItem.slot; // either may be null
    else if (event.oldItem) mcSlot = event.oldItem.slot;

    // http://wiki.vg/Protocol#Set_Slot
    let ourSlot;
    if (mcSlot >= 9) {
      // stored player inventory slots or hotbar
      const slotIndex = mcSlot - 9;
      const mcWidth = 9;
      const mcHeight = 4;
      const slotCol = slotIndex % mcWidth;
      let slotRow = Math.floor(slotIndex / mcWidth);

      if (slotRow === 3) {
        // our hotbar slots are at top, theirs at bottom TODO: change?
        slotRow = 0;
      } else {
        slotRow += (clientmc.carryPlugin.inventory.height - mcHeight);
      }

      ourSlot = clientmc.carryPlugin.inventory.width * slotRow + slotCol;
    } else if (mcSlot < 9) {
      switch(mcSlot) {
        case 0: return; // crafting output, can't set TODO: well, maybe?
        case 1: return; // crafting ingredients
        case 2: return;
        case 3: return;
        case 4: return;
        // armor slots TODO
        case 5: ourSlot = 10; break;
        case 6: ourSlot = 20; break;
        case 7: ourSlot = 30; break;
        case 8: ourSlot = 30; break;
      }
    } else {
      throw new Error('unrecognized mc inventory slot:'+event);
    }

    let pile = null;
    if (event.newItem) {
      const mcName = event.newItem.name;
      const count = event.newItem.count;

      pile = _newItemPile(mcName, count);
    }

    clientmc.carryPlugin.inventory.set(ourSlot, pile);
  };

  clientmc.heldItemSlot = (event) => {
    if (!clientmc.hotbar) return;

    clientmc.hotbar.setSelectedIndex(event.slot);
  };
};
