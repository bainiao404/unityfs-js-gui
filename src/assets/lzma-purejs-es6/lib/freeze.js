'use strict'

// Object.freeze(), or a thunk if that method is not present in this
// JavaScript environment.

const freeze = Object.freeze
    ? Object.freeze
    : function (o) {
          return o
      }

export default freeze
