=====
About
=====

This is CLI tool to send SMS messages.
Under the hood it manipulates http://mano.labas.lt.


Instalation
===========

::

	$ make install

This command will install `sms` tool to `/usr/local/bin` and config files to
`~/.sms`.


Configuration
=============

`http://mano.labas.lt` login data is located in `~/.sms/config.js`.

SMS tool supports phone book. E.g.::

	$ sms bob 'text message'

This phone book must be located at `~/.sms/phonebook.js`.
