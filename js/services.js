/***********************************************************************************
 * App Services. This contains the logic of the application organised in modules/objects. *
 ***********************************************************************************/
let fixtures = []

myApp.services = {

  localLoad: function(save = true) {
    if(localStorage.getItem('tasks') != null) {
      let serialized_tasks = localStorage.getItem('tasks')
      tasks_content = JSON.parse(serialized_tasks)
      unique_tasks = new Set(tasks_content)
      unique_tasks.forEach(task => {
        myApp.services.tasks.create(task.data, save)
      });
    }
  }, 

  /////////////////
  // Task Service //
  /////////////////
  tasks: {
    // Creates a new task and attaches it to the pending task list.
    create: function(data, save = true) {
           // Task item template.
      var taskItem = ons.createElement(
        '<ons-list-item tappable category="' + myApp.services.categories.parseId(data.category)+ '">' +
          '<label class="left">' +
           '<ons-checkbox></ons-checkbox>' +
          '</label>' +
          '<div class="center">' +
            data.title + "   | Deadline : &nbsp <strong>" + data.date + "</strong>" + 
          '</div>' +
          '<div class="right">' +
            '<ons-icon style="color: grey; padding-left: 4px" icon="ion-ios-trash-outline, material:md-delete"></ons-icon>' +
          '</div>' +
        '</ons-list-item>'
      );

      // Store data within the element.
      taskItem.data = data;
      listId = taskItem.data.state ? taskItem.data.state : "#pending-list"
      taskItem.data.state = listId
      
      // Add 'completion' functionality when the checkbox changes.
      taskItem.data.onCheckboxChange = function(event) {
        myApp.services.animators.swipe(taskItem, function() {
          if(taskItem.parentElement.id  === 'pending-list' && event.target.checked){
            listId = '#inprogress-list'
            event.target.checked = !event.target.checked
          }else if(taskItem.parentElement.id === 'inprogress-list' && event.target.checked){
            listId = '#completed-list'
          } else if(taskItem.parentElement.id === 'completed-list'){
            myApp.services.tasks.remove(taskItem);
          } else {
            listId = '#pending-list'
          }
          document.querySelector(listId).appendChild(taskItem);
          let indexToUpdate = fixtures.findIndex(task => taskItem === task)
          taskItem.data.state = listId
          fixtures[indexToUpdate] = taskItem
          let serialized_tasks = JSON.stringify(fixtures)
          localStorage.setItem("tasks", serialized_tasks)
        });
      
      };

      taskItem.addEventListener('change', taskItem.data.onCheckboxChange);

      // Add button functionality to remove a task.
      taskItem.querySelector('.right').onclick = function() {
        myApp.services.tasks.remove(taskItem);
      };

      // Add functionality to push 'details_task.html' page with the current element as a parameter.
      taskItem.querySelector('.center').onclick = function() {
        document.querySelector('#myNavigator')
          .pushPage('html/details_task.html',
            {
              animation: 'lift',
              data: {
                element: taskItem
              }
            }
          );
      };

      // Check if it's necessary to create new categories for this item.
      myApp.services.categories.updateAdd(taskItem.data.category);

      // Add the highlight if necessary.
      if (taskItem.data.highlight) {
        taskItem.classList.add('highlight');
      }
      // Insert urgent tasks at the top and non urgent tasks at the bottom.
      let stateList = document.querySelector(taskItem.data.state);
      stateList.insertBefore(taskItem, taskItem.data.urgent ? stateList.firstChild : null);
      if(save){
        fixtures.push(taskItem)
        let serialized_tasks = JSON.stringify(fixtures)
        localStorage.setItem("tasks", serialized_tasks)
      }
    },

    // Modifies the inner data and current view of an existing task.
    update: function(taskItem, data) {
      if (data.title !== taskItem.data.title) {
        // Update title view.
        taskItem.querySelector('.center').innerHTML = data.title;
      }

      if (data.category !== taskItem.data.category) {
        // Modify the item before updating categories.
        taskItem.setAttribute('category', myApp.services.categories.parseId(data.category));
        // Check if it's necessary to create new categories.
        myApp.services.categories.updateAdd(data.category);
        // Check if it's necessary to remove empty categories.
        myApp.services.categories.updateRemove(taskItem.data.category);

      }

      // Add or remove the highlight.
      taskItem.classList[data.highlight ? 'add' : 'remove']('highlight');

      // Store the new data within the element.
      oldTask = taskItem
      taskItem.data = data;
      let indexToUpdate = fixtures.findIndex(task => oldTask === task )
      fixtures[indexToUpdate] = taskItem
      let serialized_tasks = JSON.stringify(fixtures)
      localStorage.setItem("tasks", serialized_tasks)
    },

    sortAscending: function(list) {
      document.querySelector(list).innerHTML = ""
      let filter_fixtures = fixtures.filter(task => task.data.state === list)
      fixtures = fixtures.filter(task => task.data.state !== list)
      filter_fixtures.sort(function compare(a, b) {
        a = a.data.title.toLowerCase() 
        b = b.data.title.toLowerCase()
        return (a<b?-1:(a>b?1:0));  
      })
      fixtures = fixtures.concat(filter_fixtures)
      localStorage.setItem("tasks", JSON.stringify(fixtures))
      myApp.services.localLoad(false);
    },

    sortDescending: function(list) {
      document.querySelector(list).innerHTML = ""
      let filter_fixtures = fixtures.filter(task => task.data.state === list)
      fixtures = fixtures.filter(task => task.data.state !== list)
      filter_fixtures.sort(function compare(a, b) {
        a = a.data.title.toLowerCase() 
        b = b.data.title.toLowerCase()
        return (a<b?1:(a>b?-1:0));  
      })
      fixtures = fixtures.concat(filter_fixtures)
      localStorage.setItem("tasks", JSON.stringify(fixtures))
      myApp.services.localLoad(false);
    },


    // Deletes a task item and its listeners.
    remove: function(taskItem) {
      taskItem.removeEventListener('change', taskItem.data.onCheckboxChange);

      myApp.services.animators.remove(taskItem, function() {
        // Remove the item before updating the categories.
        taskItem.remove();
        // Check if the category has no items and remove it in that case.
        myApp.services.categories.updateRemove(taskItem.data.category);
      });
      let indexToRemove = fixtures.findIndex(task => taskItem === task )
      fixtures.splice(indexToRemove, 1)
      let serialized_tasks = JSON.stringify(fixtures)
      localStorage.setItem("tasks", serialized_tasks)
    },

    // Delete all the tasks from the current list
    removeList: function(list) {
      let filter_fixtures = fixtures.filter(task => task.data.state !== list)
      for (let index = 0; index < fixtures.length; index++) {
        task = fixtures[index]
        if(task.data.state === list) {
          task.removeEventListener('change', task.data.onCheckboxChange);
          myApp.services.animators.remove(task, function() {
            // Remove the item before updating the categories.
            task.remove();
            // Check if the category has no items and remove it in that case.
            myApp.services.categories.updateRemove(task.data.category);
          });
        }
      }
      fixtures = filter_fixtures
      let serialized_tasks = JSON.stringify(fixtures)
      localStorage.setItem("tasks", serialized_tasks)
    },

    // delete the deprecated tasks from the current list
    removeDeprecatedList: function(list) {
      let now = new Date()
      let filter_fixtures = fixtures.filter(task => task.data.state !== list || (task.data.state === list && new Date(task.data.date) >= now))
      for (let index = 0; index < fixtures.length; index++) {
        task = fixtures[index]
        let taskDate = new Date(task.data.date)
        if(task.data.state === list && taskDate < now) {
          //task.removeEventListener('change', task.data.onCheckboxChange);
          myApp.services.animators.remove(task, function() {
            myApp.services.categories.updateRemove(task.data.category);
          });
        }
      }
      fixtures = filter_fixtures
      let serialized_tasks = JSON.stringify(fixtures)
      localStorage.setItem("tasks", serialized_tasks)
    }
  },


  /////////////////////
  // Category Service //
  ////////////////////
  categories: {

    // Creates a new category and attaches it to the custom category list.
    create: function(categoryLabel) {
      var categoryId = myApp.services.categories.parseId(categoryLabel);

      // Category item template.
      var categoryItem = ons.createElement(
        '<ons-list-item tappable category-id="' + categoryId + '">' +
          '<div class="left">' +
            '<ons-radio name="categoryGroup" input-id="radio-'  + categoryId + '"></ons-radio>' +
          '</div>' +
          '<label class="center" for="radio-' + categoryId + '">' +
            (categoryLabel || 'No category') +
          '</label>' +
          `<img id="del" src="/lib/onsen/img/delete.svg" style="width:1rem; margin-right:1rem;"> </img>` +
        '</ons-list-item>'

      );

      categoryItem.querySelector('#del').addEventListener('click', () => myApp.services.categories.removeTasksCategorie(categoryLabel))

      // Adds filtering functionality to this category item.
      myApp.services.categories.bindOnCheckboxChange(categoryItem);

      // Attach the new category to the corresponding list.
      document.querySelector('#custom-category-list').appendChild(categoryItem);
    },

    // On task creation/update, updates the category list adding new categories if needed.
    updateAdd: function(categoryLabel) {
      var categoryId = myApp.services.categories.parseId(categoryLabel);
      var categoryItem = document.querySelector('#menuPage ons-list-item[category-id="' + categoryId + '"]');

      if (!categoryItem) {
        // If the category doesn't exist already, create it.
        myApp.services.categories.create(categoryLabel);
      }
    },

    // On task deletion/update, updates the category list removing categories without tasks if needed.
    updateRemove: function(categoryLabel) {
      var categoryId = myApp.services.categories.parseId(categoryLabel);
      var categoryItem = document.querySelector('#tabbarPage ons-list-item[category="' + categoryId + '"]');
      
      if (!categoryItem) {
        // If there are no tasks under this category, remove it.
        myApp.services.categories.remove(document.querySelector('#custom-category-list ons-list-item[category-id="' + categoryId + '"]'));
      }
    },

    // Deletes a category item and its listeners.
    remove: function(categoryItem) {
      if (categoryItem) {
        // Remove listeners and the item itself.
        categoryItem.removeEventListener('change', categoryItem.updateCategoryView);
        categoryItem.remove();
      }
    },

    removeTasksCategorie: function(categorie) {
      let filter_fixtures = fixtures.filter(task => task.data.category !== categorie)
      for (let index = 0; index < fixtures.length; index++) {
        task = fixtures[index]
        if(task.data.category === categorie) {
          task.removeEventListener('change', task.data.onCheckboxChange);
          myApp.services.animators.remove(task, function() {
            // Check if the category has no items and remove it in that case.
            myApp.services.categories.updateRemove(task.data.category);
          });
        }
      }
      fixtures = filter_fixtures
      let serialized_tasks = JSON.stringify(fixtures)
      localStorage.setItem("tasks", serialized_tasks)
    },

    // Adds filtering functionality to a category item.
    bindOnCheckboxChange: function(categoryItem) {
      var categoryId = categoryItem.getAttribute('category-id');
      var allItems = categoryId === null;

      categoryItem.updateCategoryView = function() {
        var query = '[category="' + (categoryId || '') + '"]';

        var taskItems = document.querySelectorAll('#tabbarPage ons-list-item');
        for (var i = 0; i < taskItems.length; i++) {
          taskItems[i].style.display = (allItems || taskItems[i].getAttribute('category') === categoryId) ? '' : 'none';
        }
      };

      categoryItem.addEventListener('change', categoryItem.updateCategoryView);
    },

    // Transforms a category name into a valid id.
    parseId: function(categoryLabel) {
      return categoryLabel ? categoryLabel.replace(/\s\s+/g, ' ').toLowerCase() : '';
    }
  },

  //////////////////////
  // Animation Service //
  /////////////////////
  animators: {

    // Swipe animation for task completion.
    swipe: function(listItem, callback) {
    
      var animation = (listItem.parentElement.id === 'pending-list' || 'inprogress-list') ? 'animation-swipe-right' : 'animation-swipe-left';
      listItem.classList.add('hide-children');
      listItem.classList.add(animation);

      setTimeout(function() {
        listItem.classList.remove(animation);
        listItem.classList.remove('hide-children');
        callback();
      }, 950);
    },

    // Remove animation for task deletion.
    remove: function(listItem, callback) {
      listItem.classList.add('animation-remove');
      listItem.classList.add('hide-children');

      setTimeout(function() {
        callback();
      }, 750);
    }
  },
  
};
