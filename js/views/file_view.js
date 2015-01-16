/*Setup Name Space for our application*/
var app = app || {};

/*IIFE fro our application*/
(function ($) {
    'use strict';

    //--------------
    // Model
    //--------------
    app.File = Backbone.Model.extend({
        defaults: {
            filename: "wex",
            filetype: "",
            bookmark: false,
            filesize: "",
            fileoptions: "",
            filecontent: ""
        }
    });

    //--------------
    // Collection
    //-------------
    app.Files = Backbone.Collection.extend({
        model: app.File,
        localStorage: new Store("FileManager"),
        sortAttribute: "filename",
        sortDirection: 1,

        sortFiles: function (attr) {
            this.sortAttribute = attr;
            this.sort();
        },

        comparator: function (a, b) {
            var a = a.get(this.sortAttribute),
                b = b.get(this.sortAttribute);

            if (a === b) return 0;

            if (this.sortDirection === 1) {
                return a > b ? 1 : -1;
            } else {
                return a < b ? 1 : -1;
            }
        }
    });
    //SpinUp the Collection
    app.filesList = new app.Files();

    //--------------
    // Views
    //--------------
    app.FileManagerView = Backbone.View.extend({

        tagName: 'tr',

        template: _.template($('#item-template').html()),

        events: {
            'click .destroy': 'destroy',
            'click .tablerow': 'extraMenu',
            'click .downloadfile': 'downloadFile',
            'click .bookmark': 'bookmarkFile',
            'click .previewfile': 'previewFile'

        },

        initialize: function () {
            this.model.on('change', this.render, this);
            this.model.on('destroy', this.remove, this);

        },

        render: function () {

            this.$el.html(this.template(this.model.toJSON()));

            return this;
        },

        destroy: function () {
            Messenger().post({
                message: "Sucessfully deleted - " + this.model.get("filename"),
                hideAfter: 4
            });
            this.model.destroy();
        },

        downloadFile: function (e) {

        },

        extraMenu: function (e) {
            e.preventDefault();

            var base64 = window.btoa(this.model.get("filecontent")),
                fileType = this.model.get("filetype"),
                extraOptions,
                fileDownLoadInformation;

            var previewLink = "<a class='previewfile' href='#'>Preview</a>" + "<br>",
                editLink = "<a class='editfile' href='#'>Edit</a>" + "<br>",
                bookmarkLink = "<a class='bookmark' href='#'>Bookmark</a>" + "<br>",
                downloadLink = "<a href='data:application/octet-stream;base64," + base64 + "'" + ">Download</a>" + "<br>";

            //  //All file type have these options
            extraOptions = downloadLink + bookmarkLink;

            //Special Case in HTML Files
            if (fileType === "html") {
                extraOptions += previewLink;
                extraOptions += editLink;
            }
            //Special Case in JPG Files
            if (fileType === "jpg" || fileType === "jpeg") {
                extraOptions += previewLink;
            }
            if (fileType === "txt") {
                extraOptions += editLink;
            }
            this.model.set("fileoptions", extraOptions);
        },

        previewFile: function (fileData) {

            var that = this;
            var fileType = this.model.get("filetype"),
                injectableContent;
            $("#filePreviewContent").empty();

            //File Cunstructor
            if (fileType === "html") {
                injectableContent = this.model.get("filecontent")
            }
            if (fileType === "jpg" || fileType === "jpeg") {
                injectableContent = document.createElement('span');
                injectableContent.innerHTML = ['<img class="thumb" src="', this.model.get("filecontent"),
                    '" title="', this.model.get("filename"), '"/>'].join('');
            }

            $("#preview-file-dialogue").dialog({
                show: {
                    effect: "drop",
                    duration: 300
                },
                hide: {
                    effect: "drop",
                    duration: 300
                },
                width: screen.width / 2,
                height: screen.height / 2,
                dialogClass: "noclasshere",
                resizable: false,
                draggable: true,
                modal: true,
                open: function () {
                    $("#preview-file-dialogue").dialog('option', 'title', 'Now viewing: ' + that.model.get("filename") + "." + that.model.get("filetype"));

                    $("#filePreviewContent").append(injectableContent);
                }
            });
        },

        bookmarkFile: function () {
            var bookmark = this.model.get("bookmark"),
                value;

            if (bookmark) {
                value = false;
                Messenger().post({
                    message: "Removed bookmark from: " + this.model.get("filename") + "." + this.model.get("filetype"),
                    hideAfter: 4
                });
            } else {
                value = true;
                Messenger().post({
                    message: "Added bookmark to: " + this.model.get("filename") + "." + this.model.get("filetype"),
                    hideAfter: 4
                });
            }
            this.model.save({bookmark: value});
        }
    });

    // Renders the full file list
    app.AppView = Backbone.View.extend({
        el: '#filemanageapp',
        initialize: function () {
            Messenger().post({
                message: "Welcome to file Manager Application (V 1.0)",
                hideAfter: 3
            });

            app.filesList.on('add', this.addAll, this);
            app.filesList.on('sort', this.addAll, this);
            app.filesList.fetch(); // Loads list from local storage

            //Preload clients storage
            if (app.filesList.length === 0) {
                var beenOnThisMachineBefore = localStorage.getItem('firsttime');
                if (!beenOnThisMachineBefore) {
                    localStorage.setItem("firsttime", Date());
                    Messenger().post({
                        message: "First Time Running. Initializing Demo data, which you can freely delete :) ",
                        hideAfter: 10
                    });
                    //Can't use AJAX ($.getScript) due to CORS issues
                    var head = document.getElementsByTagName('head')[0];
                    var script = document.createElement('script');

                    script.src = "./dummydataJSON.js";
                    script.type = 'text/javascript';
                    head.appendChild(script);
                }
            }
        },
        events: {
            'click #addNewFile': function () {
                this.newFile();
            },
            'click #uploadNewFile': function () {
                this.uploadNewImage();
            },
            'click #performfilter': 'filterByNameContent',
            'click #viewBookmarks': 'filterByBookmark',
            'click #sortFilesDesc': 'sortFilesDescending',
            'click #sortFilesAsc': 'sortFilesAscending',
            'click th': 'headerClick',
            'keyup #filter-extension' : 'filterByNameContent'
        },
        /*
         headerClick function will sort in asc/desc for filename, filetype and size columns
         Adding another columns for sorting is easy. Add appropriate column property in addAll function
         */
        headerClick: function (e) {
            var $el = $(e.currentTarget),
                ns = $el.attr('column'),
                sortDirection = app.filesList.sortDirection;

            if (sortDirection === -1) {
                app.filesList.sortDirection = 1
            } else {
                app.filesList.sortDirection = -1
            }
            app.filesList.sortFiles(ns);

            Messenger().post({
                message: "Files Sorted Sucessfully ",
                hideAfter: 2
            });
        },

        filterByNameContent: function () {
            var that = this;
            $('#file-list').empty();
            var search = $("#filter-extension").val().toLowerCase();
            app.filesList.forEach( function (model, value) {
                var currentModelFileName = model.get("filename").toLowerCase();
                if(currentModelFileName.indexOf(search) > -1){
                    that.addOne(model)
                }
            })
        },

        filterByBookmark: function (e) {
            /*
             Covers file extension filtering and bookmark display
             */
            $('#file-list').empty();
            var that = this;

                $('#file-list').empty();

                if ($('#viewBookmarks').hasClass("checkfilter")) {
                    $('#viewBookmarks').removeClass("checkfilter");
                    that.addAll();
                    return;
                }

                $('#viewBookmarks').addClass("checkfilter");
                var filteredModels = app.filesList.where({bookmark: true});

                filteredModels.forEach(function (key, index, value) {
                    that.addOne(key)
                });
        },

        addOne: function (model) {
            var view = new app.FileManagerView({model: model});
            $('#file-list').append(view.render().el);
        },

        addAll: function () {
            this.$('#file-list').html('');
            app.filesList.each(this.addOne, this);
            var $tbody = this.$("tbody");
            //TODO This MUST be separately rendered
            $tbody.prepend('<th class="rmventry">Delete</th><th column="filename">File Name<span class="glyphicon glyphicon-sort"></span></th><th column="filetype">File Type<span class="glyphicon glyphicon-sort"></span></th><th column="filesize">Size (KB)<span class="glyphicon glyphicon-sort"></span></th><th>Action</th><th>Bookmarked</th>\n')
        },
        /*
         imageUploader method is getting file from file input. running it in Filereader to get Binary representation
         and then sets it on canvas.
         Also, it stores the file (stringified) in local storage (key = tempImage) in following format:
         object{imageName: value
         image664: value}

         PS: Using Canvas approach instead of img element. Image implementation can be seen here : http://jsfiddle.net/8V9w6/
         */
        imageUploader: function () {
            //TODO remove this file and externalize it, via normal file inclusion or some AMD (require,js)
            var input,
                file,
                fileReader,
                img,
                tempImgData = {}; //base64 representation in filestorage

            if (typeof window.FileReader !== "function") {
                Messenger().post({
                    message: "The file API isn't supported on this browser yet. Time to change to new Browser... don't you think?",
                    hideAfter: 4
                });
                return;
            }

            input = document.getElementById("imgfile");

            if (!input.files) {
                Messenger().post({
                    message: "No support for `files` property of file inputs. HTML5 browser is required",
                    hideAfter: 4
                });
            }
            else if (!input.files[0]) {
                Messenger().post({
                    message: "Please select a file before clicking - Load",
                    hideAfter: 4
                });
            }
            else {
                file = input.files[0];
                fileReader = new FileReader();
                fileReader.onload = createImage;
                fileReader.readAsDataURL(file);
            }
            function createImage() {
                img = new Image();
                img.onload = imageLoaded;
                img.src = fileReader.result;

                tempImgData.imageName = file.name;
                tempImgData.imageb64 = fileReader.result;
                tempImgData.imageType = file.type.split("/")[1]
                //trying to preserve filesystem name
                localStorage.setItem('tempImage', JSON.stringify(tempImgData));
            }

            function imageLoaded() {
                var canvas = document.getElementById("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
            }
        },

        cameraImageUpload: function () {
            var that = this;

            var canvas = document.getElementById("camcanvas"),
                context = canvas.getContext("2d"),
                video = document.getElementById("video"),
                videoObj = { "video": true },
                errBack = function (error) {
                    //TODO implement the camera validations
                },
                wWidth = $(window).width(),
                wHeight = $(window).height();

            //Clear Context of the Canvas
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.restore();

            setTimeout(function () {
                $("#cameraControls").show();

                // Put video listeners into place
                if (navigator.getUserMedia) { // Standard
                    navigator.getUserMedia(videoObj, function (stream) {
                        video.src = stream;
                        video.play();
                    }, errBack);
                } else if (navigator.webkitGetUserMedia) { // WebKit-prefixed
                    navigator.webkitGetUserMedia(videoObj, function (stream) {
                        video.src = window.webkitURL.createObjectURL(stream);
                        video.play();
                    }, errBack);
                }
                else if (navigator.mozGetUserMedia) { // Firefox-prefixed
                    navigator.mozGetUserMedia(videoObj, function (stream) {
                        video.src = window.URL.createObjectURL(stream);
                        video.play();
                    }, errBack);
                }
            }, 1000);
        },

        uploadNewImage: function () {
            //User clicks load button to get image preview
            $("#btnLoadImage").on("click", this.imageUploader);
             /**********WARNING************
            **Not working unless served via http
            **If you want to see the camera working. serve the projects index.html (located in root) in Node, Express, IIS... anything and
            **Uncomment this line to activate camera!!!!
            ********************************/
            // this.cameraImageUpload();
            $("#upload-image-dialogue").dialog({
                show: {
                    effect: "drop",
                    duration: 300
                },
                hide: {
                    effect: "drop",
                    duration: 300
                },
                width: screen.width / 2,
                height: screen.height / 2,
                dialogClass: "noclasshere",
                resizable: false,
                draggable: true,
                modal: true,
                buttons: {
                    Grab_Image: {
                        text: "Save Image",
                        class: "noclassyet",
                        id: "grabimagebtn",
                        click: function () {

                            var imageData = JSON.parse(localStorage.getItem('tempImage'));

                            var imageObject = {
                                filename: imageData.imageName,
                                filetype: imageData.imageType,
                                filesize: imageData.imageb64.length / 1024,
                                fileoptions: "",
                                bookmark: false,
                                filecontent: imageData.imageb64
                            }
                            app.filesList.create(imageObject);
                            $(this).dialog("close");

                            Messenger().post({
                                message: "Sucessfully created image named " + imageObject.filename + "." + imageObject.filetype + " . Image size is " + imageObject.filesize,
                                hideAfter: 3
                            });
                        }
                    }
                }
            });
        },

        newFile: function () {
            $("#add-new-file-dialogue").dialog({
                show: {
                    effect: "scale",
                    duration: 300
                },
                hide: {
                    effect: "scale",
                    duration: 300
                },
                width: screen.width / 2,
                height: screen.height / 2,
                dialogClass: "noclasshere",
                resizable: false,
                draggable: true,
                modal: true,
                buttons: {
                    Grab_Image: {
                        text: "Save",
                        class: "myGreenButton",
                        id: "grabimagebtn",
                        click: function () {
                            //Todo Implement validation of user input!!!

                            var tempFileObject = {
                                "filename": $("#file-name").val(),
                                "filetype": $("#file-type").val(),
                                "filesize": $("#file-content")[0].textLength / 1024,
                                "filecontent": $("#file-content").val()
                            };
                            app.filesList.create(tempFileObject);
                            Messenger().post({
                                message: "Sucessfully created --- " + tempFileObject.filename + "." + tempFileObject.filetype + " --- :)",
                                hideAfter: 2
                            });
                            $(this).dialog("close");
                        }
                    }
                },
                open: function () {
                    //Chrome has DOM timing issue.
                    $('#file-content').empty();
                    setTimeout(function () {
                        $('#file-content').wysiwyg({
                            autoGrow: true,
                            initialContent: "1000 characters maximum",
                            maxLength: 1000,
                            controls: {
                                strikeThrough: { visible: true },
                                underline: { visible: true },
                                subscript: { visible: true },
                                superscript: { visible: true }
                            }
                        });
                    }, 1000);
                }
            });
        }
    });
    //--------------
    // Initializers
    //--------------
    app.appView = new app.AppView();
})(jQuery);